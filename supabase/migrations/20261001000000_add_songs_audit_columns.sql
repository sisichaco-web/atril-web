-- =============================================================================
-- GraceChords: add created_by / updated_by to public.songs (2026-10-01)
--
-- The review_song_suggestion RPC (20260708000400) writes these columns when
-- approving an 'addition' suggestion, but the original songs migration
-- (20260305) never created them. This migration adds them as nullable FKs to
-- auth.users so existing rows remain valid and new ones can be audited.
-- =============================================================================

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Helpful indexes for auditing queries
CREATE INDEX IF NOT EXISTS songs_created_by_idx ON public.songs (created_by);
CREATE INDEX IF NOT EXISTS songs_updated_by_idx ON public.songs (updated_by);

-- Backfill: for rows that have no creator, we can't know who created them.
-- Leave as NULL (historical data). Future rows will be populated by the RPC.