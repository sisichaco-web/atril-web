-- =============================================================================
-- GraceChords: revert created_by / updated_by from public.songs (2026-10-01)
--
-- Revert is schema-clean but DATA-LOSSY: any non-NULL created_by / updated_by
-- values on existing songs rows will be lost when the columns are dropped.
-- Apply by hand the same way the up migration is applied.
-- =============================================================================

DROP INDEX IF EXISTS public.songs_created_by_idx;
DROP INDEX IF EXISTS public.songs_updated_by_idx;

ALTER TABLE public.songs DROP COLUMN IF EXISTS updated_by;
ALTER TABLE public.songs DROP COLUMN IF EXISTS created_by;