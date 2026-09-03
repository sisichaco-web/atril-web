-- =============================================================================
-- GraceChords: Add missing RLS policies for song_suggestions (2026-10-03)
--
-- Bug Fix: song_suggestions table has RLS enabled but is missing SELECT and
-- UPDATE policies. The 20260708000200 migration only added the INSERT policy
-- (`song_suggestions_insert`) but never recreated the `read_suggestions` and
-- `editor_update` policies that were dropped in step 4. This means:
--   - No one can SELECT (read) song_suggestions
--   - No editor can UPDATE (approve/reject) song_suggestions
--   - The PendingAdditionSuggestionsPanel can never see suggestions
--
-- This migration recreates the missing policies to restore the full pipeline.
-- Idempotent: Uses DROP POLICY IF EXISTS before CREATE POLICY.
-- =============================================================================

-- Ensure RLS is enabled (should already be, but defensive)
ALTER TABLE public.song_suggestions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- Policy 1: INSERT - Any authenticated user may submit suggestions
-- (Already exists from 20260708000200 as 'song_suggestions_insert')
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "song_suggestions_insert" ON public.song_suggestions;
CREATE POLICY "song_suggestions_insert"
  ON public.song_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND suggested_by = auth.uid());

-- -----------------------------------------------------------------
-- Policy 2: SELECT - Suggester can read their own; Editor+ can read all
-- (Was missing after 20260708000200 dropped 'read_suggestions' without recreating)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "read_suggestions" ON public.song_suggestions;
CREATE POLICY "read_suggestions"
  ON public.song_suggestions
  FOR SELECT
  USING (
    suggested_by = auth.uid()
    OR public.has_min_role('editor')
  );

-- -----------------------------------------------------------------
-- Policy 3: UPDATE - Editor+ can approve/reject suggestions
-- (Was missing after 20260708000200 dropped 'editor_update' without recreating)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "editor_update" ON public.song_suggestions;
CREATE POLICY "editor_update"
  ON public.song_suggestions
  FOR UPDATE
  USING (public.has_min_role('editor'))
  WITH CHECK (public.has_min_role('editor'));

-- -----------------------------------------------------------------
-- Grant table-level permissions
-- -----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.song_suggestions TO authenticated;
GRANT SELECT ON public.suggestions TO anon;

-- -----------------------------------------------------------------
-- Verify policies are in place
-- -----------------------------------------------------------------
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'song_suggestions'
    AND schemaname = 'public';

  RAISE NOTICE 'song_suggestions now has % RLS policies (expected: 3)', policy_count;

  IF policy_count < 3 THEN
    RAISE WARNING 'Expected 3 RLS policies on song_suggestions, found %', policy_count;
  END IF;
END $$;
