-- ============================================================================
-- UCHIHA Clan — HOTFIX (Sept 2026)
-- Fixes the two bugs the clan reported:
--   1. "Messages don't send in clan chat / rooms"
--   2. "Opening a DM (پیوی) does nothing"
--
-- Root cause of bug 2: the dm_participants SELECT policy queried the
-- dm_participants table inside itself → Postgres error 42P17
-- "infinite recursion detected in policy" on every read (HTTP 500).
-- The same hazard existed in room_members policies.
--
-- Root cause of bug 1 was client-side (ambiguous FK embed) and ships in the
-- app bundle; this SQL only fixes the backend policies.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste ALL of this
-- → Run. It is idempotent and safe to re-run. No data is touched.
-- ============================================================================

-- --- 1. dm_participants: replace the self-referencing policy -----------------
drop policy if exists "participants read own participation" on public.dm_participants;
create policy "participants read own participation"
  on public.dm_participants for select to authenticated
  using (user_id = auth.uid() or public.is_dm_participant(conversation_id));

-- --- 2. room_members: replace self-referencing policies ----------------------
drop policy if exists "members read own memberships" on public.room_members;
create policy "members read own memberships"
  on public.room_members for select to authenticated
  using (user_id = auth.uid() or public.my_room_role(room_id) is not null);

drop policy if exists "leaders manage room membership" on public.room_members;
create policy "leaders manage room membership"
  on public.room_members for update to authenticated
  using (
    public.role_rank(public.my_role()) >= 3
    or public.can_moderate_room(room_id)
  )
  with check (true);

drop policy if exists "leaders add members" on public.room_members;
create policy "leaders add members"
  on public.room_members for insert to authenticated
  with check (
    public.role_rank(public.my_role()) >= 3
    or public.can_moderate_room(room_id)
  );

drop policy if exists "leaders remove members" on public.room_members;
create policy "leaders remove members"
  on public.room_members for delete to authenticated
  using (
    user_id = auth.uid()
    or public.role_rank(public.my_role()) >= 3
    or public.can_moderate_room(room_id)
  );

-- ============================================================================
-- Done. After running this, DMs open correctly again.
-- ============================================================================
