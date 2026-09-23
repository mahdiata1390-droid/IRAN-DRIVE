-- ============================================================================
-- UCHIHA CLAN MESSENGER — schema v2 MIGRATION (additive; run after schema.sql)
--
-- HOW TO APPLY:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file and click Run (idempotent; safe to re-run)
--
-- Adds: friends, reports, moderation (mute/ban), room membership, room-level
-- roles + permissions, announcements (channels), clan war, per-chat user
-- settings (pin/mute/favorite/archive), message media + forwarding, drafts.
-- No existing tables are dropped; existing data is preserved.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ROOM MEMBERSHIP + ROOM ROLES (groups with admins)
-- ============================================================================
create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_role text not null default 'member' check (room_role in ('owner','admin','moderator','member')),
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members (user_id);

alter table public.room_members enable row level security;

drop policy if exists "members read own memberships" on public.room_members;
-- Same 42P17 hazard as dm_participants: never query the table inside its own
-- SELECT policy. Use the security-definer helper for co-member reads.
create policy "members read own memberships"
  on public.room_members for select to authenticated
  using (user_id = auth.uid() or public.my_room_role(room_id) is not null);

drop policy if exists "creators join own room" on public.room_members;
create policy "creators join own room"
  on public.room_members for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid()
  ));

create or replace function public.my_room_role(rid uuid)
returns text language sql stable security definer set search_path = public as $$
  select room_role from public.room_members where room_id = rid and user_id = auth.uid()
$$;

create or replace function public.can_moderate_room(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select room_role in ('admin','owner') from public.room_members
    where room_id = rid and user_id = auth.uid()
  ), public.role_rank(public.my_role()) >= 2)
$$;

-- Room management: leaders manage info; members list needs read access to
-- other participants' rows (the select policy above covers co-members only
-- for reading, updates below are for room_role changes by leaders).
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
-- 2. MESSAGE MEDIA + FORWARDING (columns on existing messages table)
-- ============================================================================
alter table public.messages
  add column if not exists media_type text check (media_type in ('image','video','audio','voice','file','sticker')),
  add column if not exists media_url text,
  add column if not exists media_name text,
  add column if not exists media_size bigint,
  add column if not exists media_duration_ms int,
  add column if not exists media_waveform jsonb,
  add column if not exists forwarded_from text,
  add column if not exists hashtag text;

create index if not exists messages_hashtag_idx on public.messages (hashtag)
  where hashtag is not null;

-- ============================================================================
-- 3. PER-USER CHAT SETTINGS (pin/mute/favorite/archive, drafts)
-- ============================================================================
create table if not exists public.chat_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  pinned boolean not null default false,
  muted boolean not null default false,
  favorite boolean not null default false,
  archived boolean not null default false,
  draft text not null default '',
  updated_at timestamptz not null default now(),
  -- Exactly one of room_id / conversation_id must be set per row.
  constraint chat_settings_scope check (
    (room_id is null) <> (conversation_id is null)
  )
);
-- Partial unique indexes keep one scope non-null per row.
create unique index if not exists chat_settings_room_uq
  on public.chat_settings (user_id, room_id) where room_id is not null;
create unique index if not exists chat_settings_conv_uq
  on public.chat_settings (user_id, conversation_id) where conversation_id is not null;

alter table public.chat_settings enable row level security;

drop policy if exists "own chat settings" on public.chat_settings;
create policy "own chat settings"
  on public.chat_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- 4. FRIENDS
-- ============================================================================
create table if not exists public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint friendship_order check (user_low < user_high)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
create index if not exists friend_requests_to_idx on public.friend_requests (to_user, status);

alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "read own friend requests" on public.friend_requests;
create policy "read own friend requests"
  on public.friend_requests for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

create or replace function public.send_friend_request(other uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if other is null or other = me then raise exception 'Invalid target'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'User not found'; end if;
  if exists (select 1 from public.friend_requests where from_user = me and to_user = other and status = 'pending') then
    return; -- idempotent
  end if;
  delete from public.friend_requests where from_user = other and to_user = me and status = 'pending';
  insert into public.friend_requests (from_user, to_user) values (me, other)
  on conflict (from_user, to_user) do update set status = 'pending';
end $$;

create or replace function public.respond_friend_request(req_id uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r record; lo uuid; hi uuid;
begin
  select * into r from public.friend_requests where id = req_id and to_user = auth.uid() and status = 'pending';
  if r is null then raise exception 'Request not found'; end if;
  update public.friend_requests set status = case when accept then 'accepted' else 'rejected' end where id = req_id;
  if accept then
    lo := least(r.from_user, auth.uid());
    hi := greatest(r.from_user, auth.uid());
    insert into public.friendships (user_low, user_high) values (lo, hi)
    on conflict (user_low, user_high) do nothing;
  end if;
end $$;

create or replace function public.remove_friend(other uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships
  where (user_low = least(auth.uid(), other) and user_high = greatest(auth.uid(), other));
end $$;

create or replace function public.my_friends()
returns table (
  id uuid, username text, display_name text, avatar_url text, role text,
  last_seen timestamptz, friends_since timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.role, p.last_seen, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  where f.user_low = auth.uid() or f.user_high = auth.uid()
$$;

create or replace function public.my_friend_requests()
returns table (
  id uuid, from_user uuid, username text, display_name text, avatar_url text, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select r.id, r.from_user, p.username, p.display_name, p.avatar_url, r.created_at
  from public.friend_requests r
  join public.profiles p on p.id = r.from_user
  where r.to_user = auth.uid() and r.status = 'pending'
  order by r.created_at desc
$$;

revoke all on function public.send_friend_request(uuid) from anon;
revoke all on function public.respond_friend_request(uuid, boolean) from anon;
revoke all on function public.remove_friend(uuid) from anon;
revoke all on function public.my_friends() from anon;
revoke all on function public.my_friend_requests() from anon;

-- ============================================================================
-- 5. MODERATION (mute/ban) + REPORTS
-- ============================================================================
create table if not exists public.user_moderation (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_until timestamptz,
  banned boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

alter table public.user_moderation enable row level security;

drop policy if exists "mods read moderation" on public.user_moderation;
create policy "mods read moderation"
  on public.user_moderation for select to authenticated
  using (auth.uid() = user_id or public.is_mod());

create or replace function public.am_i_muted()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select muted_until > now() from public.user_moderation where user_id = auth.uid()), false)
$$;

create or replace function public.set_user_mute(target uuid, until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.role_rank(public.my_role()) < 2 then raise exception 'Moderator or higher required'; end if;
  if public.role_rank((select role from public.profiles where id = target))
     >= public.role_rank(public.my_role()) then
    raise exception 'Cannot moderate equal or higher rank';
  end if;
  insert into public.user_moderation (user_id, muted_until, updated_by)
  values (target, until, auth.uid())
  on conflict (user_id) do update set muted_until = until, updated_by = auth.uid(), updated_at = now();
end $$;

create or replace function public.set_user_ban(target uuid, banned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.role_rank(public.my_role()) < 3 then raise exception 'Co-Leader or higher required'; end if;
  if target = auth.uid() then raise exception 'Cannot ban yourself'; end if;
  if public.role_rank((select role from public.profiles where id = target))
     >= public.role_rank(public.my_role()) then
    raise exception 'Cannot moderate equal or higher rank';
  end if;
  insert into public.user_moderation (user_id, banned, updated_by)
  values (target, banned, auth.uid())
  on conflict (user_id) do update set banned = banned, updated_by = auth.uid(), updated_at = now();
end $$;

-- ============ REPORTS ============
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  target_user uuid references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_open_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reporters see own" on public.reports;
create policy "reporters see own"
  on public.reports for select to authenticated
  using (reporter = auth.uid() or public.is_mod());

drop policy if exists "submit reports" on public.reports;
create policy "submit reports"
  on public.reports for insert to authenticated
  with check (reporter = auth.uid() and (target_user is not null or message_id is not null or room_id is not null));

drop policy if exists "mods resolve reports" on public.reports;
create policy "mods resolve reports"
  on public.reports for update to authenticated
  using (public.is_mod()) with check (public.is_mod());

-- ============ GLOBAL SEARCH (privacy-respecting) ============
create or replace function public.global_search(q text)
returns table (
  kind text,
  id uuid,
  title text,
  subtitle text,
  avatar_url text,
  username text
) language sql stable security definer set search_path = public as $$
  select * from (
    select 'user'::text as kind, p.id, p.display_name as title, p.username as subtitle,
           p.avatar_url, p.username
    from public.profiles p
    where p.username ilike '%' || q || '%' or p.display_name ilike '%' || q || '%'
    limit 15
  ) users
  union all
  select * from (
    select 'room'::text as kind, r.id, r.name as title, r.description as subtitle,
           null::text as avatar_url, null::text as username
    from public.rooms r
    where r.name ilike '%' || q || '%' or r.description ilike '%' || q || '%'
    limit 10
  ) rooms
  union all
  select * from (
    select 'message'::text as kind, m.id, left(m.content, 120) as title, r2.name as subtitle,
           null::text as avatar_url, p2.username
    from public.messages m
    join public.rooms r2 on r2.id = m.room_id
    join public.profiles p2 on p2.id = m.sender_id
    where m.deleted_at is null and m.content ilike '%' || q || '%'
    limit 15
  ) messages
$$;

revoke all on function public.global_search(text) from anon;

-- ============================================================================
-- 6. ANNOUNCEMENTS (channels)
-- ============================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  priority text not null default 'normal' check (priority in ('normal','important','critical')),
  pinned boolean not null default false,
  author uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable"
  on public.announcements for select to authenticated using (true);

drop policy if exists "leaders publish announcements" on public.announcements;
create policy "leaders publish announcements"
  on public.announcements for insert to authenticated
  with check (author = auth.uid() and public.role_rank(public.my_role()) >= 3);

drop policy if exists "leaders edit announcements" on public.announcements;
create policy "leaders edit announcements"
  on public.announcements for update to authenticated
  using (public.role_rank(public.my_role()) >= 3 or author = auth.uid());

drop policy if exists "leaders delete announcements" on public.announcements;
create policy "leaders delete announcements"
  on public.announcements for delete to authenticated
  using (public.role_rank(public.my_role()) >= 3 or author = auth.uid());

-- ============================================================================
-- 7. CLAN WAR (schedule / teams / results)
-- ============================================================================
create table if not exists public.war_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  opponent text not null default '',
  starts_at timestamptz not null,
  teams jsonb not null default '[]',
  result text check (result in ('win','loss','draw') or result is null),
  score text,
  notes text default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists war_events_start_idx on public.war_events (starts_at desc);

alter table public.war_events enable row level security;

drop policy if exists "war readable" on public.war_events;
create policy "war readable" on public.war_events for select to authenticated using (true);

drop policy if exists "leaders manage war" on public.war_events;
create policy "leaders manage war"
  on public.war_events for all to authenticated
  using (public.role_rank(public.my_role()) >= 3)
  with check (public.role_rank(public.my_role()) >= 3);

-- ============================================================================
-- 8. EXTENDED NOTIFICATION TYPES (friend request, role change, announcements)
-- ============================================================================
do $$ begin
  alter table public.notifications drop constraint notifications_type_check;
exception when undefined_object then null; end $$;

do $$ begin
  alter table public.notifications add constraint notifications_type_check
    check (type in ('dm','mention','friend_request','role_change','announcement'));
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 9. MEDIA STORAGE (private bucket for photos/videos/voice/files)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do update set public = false;

drop policy if exists "media read own files" on storage.objects;
create policy "media read own files"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media upload own folder" on storage.objects;
create policy "media upload own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media update own files" on storage.objects;
create policy "media update own files"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media delete own files" on storage.objects;
create policy "media delete own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 10. REALTIME for new tables
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.friend_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- DONE. Re-run schema.sql first if starting fresh, then this file.
-- ============================================================================
