-- Run once in Supabase Dashboard -> SQL Editor.
-- Vercel deploys the web client only; it does not apply database functions.

create or replace function public.claim_ownership()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  if exists (select 1 from public.profiles where role = 'owner') then
    raise exception 'An Owner already exists';
  end if;

  perform set_config('app.role_change', 'granted', true);
  update public.profiles set role = 'owner' where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

grant execute on function public.claim_ownership() to authenticated;