-- =============================================================================
-- Set sisichaco@gmail.com as owner (2026-09-01)
--
-- This migration updates the user with email 'sisichaco@gmail.com' to have
-- the 'owner' role. There is exactly one owner in GraceChords.
--
-- Idempotent: uses DO block to safely handle the case where the user doesn't
-- exist or is already owner.
-- =============================================================================

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user ID from auth.users where email = 'sisichaco@gmail.com'
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'sisichaco@gmail.com'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email sisichaco@gmail.com not found in auth.users';
  END IF;

  -- Update the role to 'owner' in public.users
  UPDATE public.users
  SET role = 'owner'
  WHERE id = target_user_id;

  -- Verify the update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not update role for user %', target_user_id;
  END IF;

  RAISE NOTICE 'User % (sisichaco@gmail.com) updated to owner role', target_user_id;
END;
$$;
