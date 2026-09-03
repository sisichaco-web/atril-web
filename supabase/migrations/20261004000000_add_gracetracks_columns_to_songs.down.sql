-- Revert for 20261004000000_add_gracetracks_columns_to_songs.sql
--
-- Schema-clean only: dropping the columns also drops any data they held
-- (stem_slug / gracetracks_url strings for songs that had has_stems=true).
-- This is not data-lossless — re-applying the up migration will not restore
-- the previous values.

DROP INDEX IF EXISTS public.songs_has_stems_idx;

ALTER TABLE public.songs
  DROP COLUMN IF EXISTS gracetracks_url,
  DROP COLUMN IF EXISTS stem_slug,
  DROP COLUMN IF EXISTS has_stems;
