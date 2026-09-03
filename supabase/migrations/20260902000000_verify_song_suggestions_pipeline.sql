-- =============================================================================
-- GraceChords: song_suggestions pipeline verification + constraints (2026-09-02)
--
-- Audited end-to-end flow:
--   1. submitSongSuggestion() → INSERT song_suggestions (type, payload, status='pending')
--   2. fetchPendingAdditionSuggestions() → SELECT WHERE type='addition' AND song_id IS NULL AND status='pending'
--   3. review_song_suggestion(approve) → INSERT songs + UPDATE song_suggestions.status='approved'
--   4. useSongs() → SELECT songs WHERE is_deleted=false
--
-- Verifications applied here:
--   A. songs.status CHECK constraint exists (idempotent)
--   B. songs.is_deleted NOT NULL + DEFAULT false (idempotent)
--   C. song_suggestions.status CHECK constraint (idempotent)
--   D. song_suggestions.type CHECK constraint (idempotent)
--
-- Apply by hand after verifying the pipeline with a test song.
-- =============================================================================

-- A. songs.status CHECK (added by 20260728000100 but re-add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.songs'::regclass
      AND conname  = 'songs_status_check'
  ) THEN
    -- Column status might also be missing (fresh DB). Add it with the same
    -- DEFAULT 'published' that 20260728000100 installs.
    ALTER TABLE public.songs
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
    ALTER TABLE public.songs
      ADD CONSTRAINT songs_status_check CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- B. songs.is_deleted guard (idempotent re-apply)
ALTER TABLE public.songs
  ALTER COLUMN is_deleted SET NOT NULL,
  ALTER COLUMN is_deleted SET DEFAULT false;

-- C. song_suggestions.status CHECK (was added by 20260708000200)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.song_suggestions'::regclass
      AND conname  = 'song_suggestions_status_check'
  ) THEN
    ALTER TABLE public.song_suggestions
      ADD CONSTRAINT song_suggestions_status_check
        CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- D. song_suggestions.type CHECK (was added by 20260708000200)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.song_suggestions'::regclass
      AND conname  = 'song_suggestions_type_check'
  ) THEN
    ALTER TABLE public.song_suggestions
      ADD CONSTRAINT song_suggestions_type_check
        CHECK (type IN ('addition', 'edit', 'deletion'));
  END IF;
END $$;