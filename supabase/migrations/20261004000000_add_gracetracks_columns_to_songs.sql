-- =============================================================================
-- GraceChords: add GraceTracks columns to public.songs (2026-10-04)
--
-- apps/web/src/hooks/useSongs.jsx selects `has_stems`, `stem_slug`, and
-- `gracetracks_url` on every catalog load. PostgREST returns 400 for any
-- unknown column in the `select=` projection, so an empty list is silently
-- served and the home page renders no songs. Adding the columns closes
-- the gap between the code that was written for the GraceTracks integration
-- and the table schema that has not caught up yet (see README.md —
-- "GraceTracks integration — next up").
--
-- All three are nullable except `has_stems`, which defaults to false so
-- existing rows are not re-evaluated by the planner and the column is
-- safe to use in RLS / index predicates later. `stem_slug` and
-- `gracetracks_url` are nullable because they only carry meaning when
-- `has_stems` is true.
-- =============================================================================

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS has_stems        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stem_slug        text,
  ADD COLUMN IF NOT EXISTS gracetracks_url  text;

-- Backs the `WHERE has_stems = true` lookups a future GraceTracks listing
-- will need. Cheap to keep because the table is small and most rows are false,
-- so the index stays tiny.
CREATE INDEX IF NOT EXISTS songs_has_stems_idx
  ON public.songs (has_stems)
  WHERE has_stems = true;

COMMENT ON COLUMN public.songs.has_stems       IS 'True when a GraceTracks stem pack is published for this song. Gated UI in SongViewPage reads this before showing the link.';
COMMENT ON COLUMN public.songs.stem_slug       IS 'Slug of the GraceTracks stem pack; null when has_stems is false.';
COMMENT ON COLUMN public.songs.gracetracks_url IS 'Public URL to the GraceTracks audio assets; null when has_stems is false.';
