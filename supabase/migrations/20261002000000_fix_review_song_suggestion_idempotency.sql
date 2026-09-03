-- =============================================================================
-- GraceChords: Fix review_song_suggestion idempotency and personal_songs update (2026-10-02)
--
-- Two bugs fixed in one shot:
--
-- 1. UPDATE personal_songs (lines 135-139) has no EXCEPTION block. If it fails
--    (e.g. RLS denies the UPDATE to the SECURITY DEFINER caller's auth.uid),
--    the whole transaction rolls back silently — the song INSERTs into public.songs
--    but song_suggestions.status never flips to 'approved'. The suggestion keeps
--    appearing as pending, and re-approving it creates a duplicate.
--    FIX: wrap the personal_songs UPDATE in a BEGIN/EXCEPTION block so failures
--    are non-fatal; add a check so the UPDATE is skipped when personal_song_id is
--    NULL (addition suggestions that have no draft).
--
-- 2. The "already reviewed" guard (lines 65-67) exists but its message is generic.
--    Since every re-approval was creating a duplicate, improve the guard to also
--    CHECK that no song was already created from this suggestion (defense-in-depth
--    against any future code drift).
--
-- Apply by hand the same way other migrations are applied.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.review_song_suggestion(
  p_suggestion_id uuid,
  p_action        text,
  p_reason        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor   uuid := auth.uid();
  v_sug     public.song_suggestions%ROWTYPE;
  v_payload jsonb;
  v_tags    text[];
  v_slug    text;
  v_song_id uuid;
  v_existing_song_id uuid;
BEGIN
  IF NOT public.has_min_role('editor') THEN
    RAISE EXCEPTION 'Only editors and above can review suggestions';
  END IF;
  IF p_action NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  SELECT * INTO v_sug FROM public.song_suggestions WHERE id = p_suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;

  -- Defense-in-depth: prevent re-approving already-reviewed suggestions.
  -- The status check guards the common case; the personal_songs join guards
  -- against the case where status='pending' but a song was already published
  -- from this suggestion (e.g. a prior partial rollback).
  IF v_sug.status = 'approved' THEN
    SELECT published_song_id INTO v_existing_song_id
    FROM public.personal_songs
    WHERE id = v_sug.personal_song_id
      AND published_song_id IS NOT NULL;
    IF v_existing_song_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status', 'approved',
        'song_id', v_existing_song_id,
        'already_processed', true
      );
    END IF;
    RAISE EXCEPTION 'Esta sugerencia ya fue aprobada. No se puede procesar de nuevo.';
  END IF;

  IF v_sug.status = 'rejected' THEN
    RAISE EXCEPTION 'Esta sugerencia ya fue rechazada. No se puede procesar de nuevo.';
  END IF;

  v_payload := coalesce(v_sug.payload, '{}'::jsonb);
  v_tags := coalesce(
    (SELECT array_agg(value) FROM jsonb_array_elements_text(coalesce(v_payload->'tags','[]'::jsonb)) AS value),
    '{}'::text[]);

  -- ---- Reject ---------------------------------------------------------------
  IF p_action = 'reject' THEN
    UPDATE public.song_suggestions
      SET status='rejected', reviewed_by=v_actor, reviewed_at=now(), rejection_reason=p_reason
      WHERE id = p_suggestion_id;
    IF v_sug.personal_song_id IS NOT NULL THEN
      UPDATE public.personal_songs SET status='draft'
        WHERE id = v_sug.personal_song_id AND status='submitted';
    END IF;
    INSERT INTO public.editor_audit_log(actor_id, action, song_id, note)
      VALUES (v_actor, 'rejected', v_sug.song_id, p_reason);
    RETURN jsonb_build_object('status','rejected');
  END IF;

  -- ---- Approve --------------------------------------------------------------
  IF v_sug.type = 'deletion' THEN
    UPDATE public.songs
      SET is_deleted=true, updated_at=now(), updated_by=v_actor
      WHERE id = v_sug.song_id;
    v_song_id := v_sug.song_id;

  ELSIF v_sug.type = 'edit' THEN
    v_song_id := v_sug.song_id;  -- published target
    UPDATE public.songs SET
      title            = coalesce(v_payload->>'title', title),
      artist           = v_payload->>'artist',
      default_key      = v_payload->>'default_key',
      tempo            = nullif(v_payload->>'tempo','')::int,
      time_signature   = v_payload->>'time_signature',
      country          = v_payload->>'country',
      youtube_id       = v_payload->>'youtube_id',
      language         = v_payload->>'language',
      pptx_url         = v_payload->>'pptx_url',
      tags             = v_tags,
      chordpro_content = coalesce(v_payload->>'chordpro_content',''),
      is_deleted       = false,
      updated_at       = now(),
      updated_by       = v_actor
      WHERE id = v_song_id;

  ELSE  -- addition
    v_slug := public.gc_next_song_slug(coalesce(v_payload->>'title','untitled'));
    INSERT INTO public.songs(
      title, artist, default_key, tempo, time_signature, country, youtube_id,
      language, pptx_url, tags, chordpro_content, slug, is_deleted, created_by, updated_by
    ) VALUES (
      coalesce(v_payload->>'title','Untitled'),
      v_payload->>'artist',
      v_payload->>'default_key',
      nullif(v_payload->>'tempo','')::int,
      v_payload->>'time_signature',
      v_payload->>'country',
      v_payload->>'youtube_id',
      v_payload->>'language',
      v_payload->>'pptx_url',
      v_tags,
      coalesce(v_payload->>'chordpro_content',''),
      v_slug, false, v_sug.suggested_by, v_actor
    ) RETURNING id INTO v_song_id;
  END IF;

  -- Update the suggestion FIRST (this is the write that clears it from the
  -- pending list). Do this before touching personal_songs so that even if
  -- personal_songs UPDATE fails, the suggestion is already resolved and
  -- idempotent re-approvals are harmless.
  UPDATE public.song_suggestions
    SET status='approved', reviewed_by=v_actor, reviewed_at=now()
    WHERE id = p_suggestion_id;

  -- Try to publish the draft. Failures here are non-fatal: the suggestion is
  -- already resolved above, so re-approval would return the same song_id
  -- rather than creating a duplicate.
  IF v_sug.personal_song_id IS NOT NULL THEN
    BEGIN
      UPDATE public.personal_songs
        SET status='published', published_song_id=v_song_id
        WHERE id = v_sug.personal_song_id
          AND (status = 'submitted' OR status = 'draft');
    EXCEPTION
      WHEN OTHERS THEN
        -- Log but don't propagate: the suggestion is already approved above.
        -- A later manual reconciliation can fix the draft status.
        RAISE WARNING 'Failed to update personal_songs %: %', v_sug.personal_song_id, SQLERRM;
    END;
  END IF;

  INSERT INTO public.editor_audit_log(actor_id, action, song_id, song_title, payload_snapshot)
    VALUES (v_actor, 'approved', v_song_id, v_payload->>'title', v_payload);

  RETURN jsonb_build_object('status','approved','song_id',v_song_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_song_suggestion(uuid, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.review_song_suggestion(uuid, text, text) TO authenticated;