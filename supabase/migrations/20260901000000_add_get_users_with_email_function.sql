-- =============================================================================
-- Add function to get users with emails (SECURITY DEFINER) (2026-09-01)
-- 
-- This function allows admins/owners to view user emails by joining with
-- auth.users. It uses SECURITY DEFINER to bypass RLS on auth.users.
--
-- Idempotent. Run inside a single transaction.
-- =============================================================================

-- Create the function
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text,
  account_created_at timestamptz,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify caller is admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only admin/owner can access user emails';
  END IF;

  -- Return users with emails from auth.users
  RETURN QUERY
  SELECT
    u.id,
    au.email,
    u.display_name,
    u.role,
    u.account_created_at,
    u.created_at
  FROM public.users u
  INNER JOIN auth.users au ON u.id = au.id
  ORDER BY u.account_created_at DESC;
END;
$$;

-- Grant EXECUTE permission to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated, service_role;
