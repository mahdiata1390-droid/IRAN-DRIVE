-- Run in Supabase Dashboard -> SQL Editor.
-- Promotes the existing user KUROKAMI without deleting any data.

begin;

DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id
  FROM public.profiles
  WHERE lower(username) = lower('KUROKAMI')
  LIMIT 1;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'User KUROKAMI was not found';
  END IF;

  UPDATE public.profiles
  SET role = 'co_leader'
  WHERE role = 'owner' AND id <> target_id;

  PERFORM set_config('app.role_change', 'granted', true);
  UPDATE public.profiles
  SET role = 'owner'
  WHERE id = target_id;
END $$;

commit;

SELECT username, role
FROM public.profiles
WHERE lower(username) = lower('KUROKAMI');
