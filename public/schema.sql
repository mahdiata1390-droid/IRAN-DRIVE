-- ============================================================================
-- UCHIHA CLAN MESSENGER — Supabase backend schema
--
-- HOW TO APPLY (required one-time step):
--   1. Open https://supabase.com/dashboard → your project
--   2. SQL Editor → New query
--   3. Paste this ENTIRE file and click Run
--
-- Everything below is idempotent — it is safe to run more than once.
--
-- AUTH MODEL: username + password (Supabase Email Auth under the hood).
--   • The app registers users with a synthetic internal address
--     `<username>@users.uchiha.clan`; users only ever see their username.
--     Passwords are hashed by Supabase Auth — never stored or exposed by
--     the app or the database schema below.
--   • In Dashboard → Authentication → Providers → Email, DISABLE
--     "Confirm email" so registration logs the user in immediately.
--   • auth.users is not readable by anon/authenticated roles, so internal
--     addresses stay private at the database level by construction.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text not null default 'New Recruit',
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  cod_uid text check (cod_uid is null or cod_uid ~ '^[0-9]{5,12}$'),
  role text not null default 'member'
    check (role in ('owner','leader','co_leader','moderator','member')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by clan members" on public.profiles;
create policy "profiles are readable by clan members"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Role changes and username changes are guarded server-side.
create or replace function public.enforce_profile_updates()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('app.role_change', true), '') <> 'granted' then
    raise exception 'Role changes must go through set_member_role()';
  end if;
  if new.username is distinct from old.username then
    raise exception 'Username cannot be changed';
  end if;
  new.last_seen := now();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists enforce_profile_updates_trg on public.profiles;
create trigger enforce_profile_updates_trg
  before update on public.profiles
  for each row execute function public.enforce_profile_updates();

-- Auto-create the profile whenever a user signs up. The app passes the
-- chosen username + display name in signup metadata, so the profile row is
-- complete immediately (username/password flow). Falls back to the internal
-- email prefix for any user created without metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  uname text;
  seed text;
begin
  seed := coalesce(
    new.raw_user_meta_data->>'username',
    nullif(split_part(new.email, '@', 1), '')
  );
  base := regexp_replace(coalesce(seed, 'uchiha_user'), '[^a-zA-Z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'uchiha_' || base;
  end if;
  base := substr(base, 1, 20);

  begin
    insert into public.profiles (id, username, display_name, cod_uid)
    values (
      new.id,
      base,
      coalesce(new.raw_user_meta_data->>'display_name', base),
      nullif(new.raw_user_meta_data->>'cod_uid', '')
    );
  exception when unique_violation then
    uname := substr(base, 1, 14) || '_' || substr(replace(new.id::text, '-', ''), 1, 5);
    insert into public.profiles (id, username, display_name, cod_uid)
    values (
      new.id,
      uname,
      coalesce(new.raw_user_meta_data->>'display_name', base),
      nullif(new.raw_user_meta_data->>'cod_uid', '')
    );
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The auth service role must be able to run the profile-creation trigger.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

-- ============================================================================
-- 1.5 AUTH BOOTSTRAP RPC
-- ============================================================================
-- Returns true once the signed-in user has a real (non-fallback) profile row.
-- Returns false for users with no profile at all (e.g. users created before
-- this schema existed) so the app can route them to profile setup.
create or replace function public.has_profile()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.username !~ '^uchiha_[0-9]{1,12}$'
  )
$$;

revoke all on function public.has_profile from anon;

-- ============================================================================
-- 2. ROLE HELPERS + ROLE MANAGEMENT (server-side permission enforcement)
-- ============================================================================
create or replace function public.role_rank(r text)
returns int language sql immutable as $$
  select case r
    when 'owner' then 5
    when 'leader' then 4
    when 'co_leader' then 3
    when 'moderator' then 2
    when 'member' then 1
    else 0
  end
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_mod()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.role_rank(public.my_role()) >= 2, false)
$$;

create or replace function public.is_leader()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.role_rank(public.my_role()) >= 3, false)
$$;

-- Assign clan roles. Enforced here so the client cannot bypass permissions.
create or replace function public.set_member_role(target_user uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  my_role text;
  target_role text;
begin
  if new_role not in ('owner','leader','co_leader','moderator','member') then
    raise exception 'Invalid role';
  end if;

  select role into my_role from public.profiles where id = auth.uid();
  select role into target_role from public.profiles where id = target_user;
  if my_role is null or target_role is null then
    raise exception 'Not allowed';
  end if;

  if public.role_rank(my_role) <= public.role_rank(target_role) then
    raise exception 'You cannot modify someone with equal or higher rank';
  end if;

  if new_role in ('member','moderator') then
    if public.role_rank(my_role) < 3 then raise exception 'Requires Co-Leader or higher'; end if;
  elsif new_role = 'co_leader' then
    if public.role_rank(my_role) < 4 then raise exception 'Requires Leader or higher'; end if;
  elsif new_role in ('leader','owner') then
    if my_role <> 'owner' then raise exception 'Only the Owner can assign Leader or Owner'; end if;
  end if;

  -- Never leave the clan without an Owner.
  if target_role = 'owner' and new_role <> 'owner' then
    if not exists (select 1 from public.profiles where role = 'owner' and id <> target_user) then
      raise exception 'Promote another Owner before demoting the only Owner';
    end if;
  end if;

  perform set_config('app.role_change', 'granted', true);
  update public.profiles set role = new_role where id = target_user;

  if new_role = 'owner' then
    update public.profiles set role = 'co_leader' where role = 'owner' and id <> target_user;
  end if;
end $$;

-- One-time bootstrap: the first member to claim becomes Owner.
create or replace function public.claim_ownership()
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where role = 'owner') then
    raise exception 'An Owner already exists';
  end if;
  perform set_config('app.role_change', 'granted', true);
  update public.profiles set role = 'owner' where id = auth.uid();
end $$;

revoke all on function public.set_member_role from anon;
revoke all on function public.claim_ownership from anon;

-- ============================================================================
-- 3. ROOMS (clan chat + group rooms)
-- ============================================================================
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 32),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,32}$'),
  description text not null default '',
  kind text not null default 'room' check (kind in ('clan','room')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "rooms readable" on public.rooms;
create policy "rooms readable" on public.rooms for select to authenticated using (true);

drop policy if exists "leaders create rooms" on public.rooms;
create policy "leaders create rooms"
  on public.rooms for insert to authenticated
  with check (auth.uid() = created_by and public.role_rank(public.my_role()) >= 3);

drop policy if exists "leaders update rooms" on public.rooms;
create policy "leaders update rooms"
  on public.rooms for update to authenticated
  using (public.role_rank(public.my_role()) >= 4)
  with check (public.role_rank(public.my_role()) >= 4);

drop policy if exists "owners delete rooms" on public.rooms;
create policy "owners delete rooms"
  on public.rooms for delete to authenticated
  using (public.role_rank(public.my_role()) >= 5 and kind = 'room');

insert into public.rooms (name, slug, description, kind) values
  ('Clan Chat', 'clan-chat', 'Official UCHIHA clan chat', 'clan'),
  ('General', 'general', 'Hang out and talk about anything', 'room'),
  ('War Room', 'war-room', 'Clan war strategy and coordination', 'room'),
  ('Ranked', 'ranked', 'Ranked grind, teammates and BP push', 'room'),
  ('Multiplayer', 'multiplayer', 'MP lobbies, loadouts and events', 'room'),
  ('Events', 'events', 'Tournaments, scrims and clan events', 'room')
on conflict (slug) do nothing;

-- ============================================================================
-- 4. DIRECT MESSAGES
-- ============================================================================
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.dm_participants (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;

drop policy if exists "participants read conversations" on public.dm_conversations;
create policy "participants read conversations"
  on public.dm_conversations for select to authenticated
  using (exists (
    select 1 from public.dm_participants p
    where p.conversation_id = id and p.user_id = auth.uid()
  ));

drop policy if exists "participants read own participation" on public.dm_participants;
create policy "participants read own participation"
  on public.dm_participants for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.dm_participants p2
    where p2.conversation_id = conversation_id and p2.user_id = auth.uid()
  ));

create or replace function public.is_dm_participant(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.dm_participants
    where conversation_id = cid and user_id = auth.uid()
  )
$$;

-- Get or create the 1:1 conversation with another member.
create or replace function public.create_dm(other_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  if other_user is null or other_user = auth.uid() then
    raise exception 'Cannot open a chat with yourself';
  end if;
  if not exists (select 1 from public.profiles where id = other_user) then
    raise exception 'Member not found';
  end if;

  select c.id into cid
  from public.dm_conversations c
  join public.dm_participants a on a.conversation_id = c.id and a.user_id = auth.uid()
  join public.dm_participants b on b.conversation_id = c.id and b.user_id = other_user
  limit 1;

  if cid is null then
    insert into public.dm_conversations values (default) returning id into cid;
    insert into public.dm_participants (conversation_id, user_id)
      values (cid, auth.uid()), (cid, other_user);
  end if;
  return cid;
end $$;

revoke all on function public.create_dm from anon;

-- ============================================================================
-- 5. MESSAGES (shared by rooms and DMs)
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 4000),
  reply_to_id uuid references public.messages(id) on delete set null,
  mentions uuid[] not null default '{}',
  pinned boolean not null default false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_scope check ((room_id is null) <> (conversation_id is null))
);

create index if not exists messages_room_idx on public.messages (room_id, created_at desc);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;

drop policy if exists "read messages in scope" on public.messages;
create policy "read messages in scope"
  on public.messages for select to authenticated
  using ((room_id is not null) or public.is_dm_participant(conversation_id));

drop policy if exists "send messages in scope" on public.messages;
create policy "send messages in scope"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and ((room_id is not null) or public.is_dm_participant(conversation_id))
  );

drop policy if exists "edit own or moderate" on public.messages;
create policy "edit own or moderate"
  on public.messages for update to authenticated
  using (
    sender_id = auth.uid()
    or (room_id is not null and public.is_mod())
  )
  with check (sender_id is not null);

-- Mention extraction used by inserts and edits.
create or replace function public.extract_mentions(content text)
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.id), '{}')
  from public.profiles p
  where p.username is not null
    and content ~* ('@' || p.username || '\M')
$$;

-- Insert-time validation + mention parsing.
create or replace function public.validate_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare reply record;
begin
  new.mentions := public.extract_mentions(new.content);
  if new.reply_to_id is not null then
    select * into reply from public.messages where id = new.reply_to_id;
    if reply is null then
      raise exception 'Reply target not found';
    end if;
    if reply.room_id is distinct from new.room_id
       or reply.conversation_id is distinct from new.conversation_id then
      raise exception 'Reply target must be in the same chat';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists validate_message_insert_trg on public.messages;
create trigger validate_message_insert_trg
  before insert on public.messages
  for each row execute function public.validate_message_insert();

-- Update-time enforcement: only senders edit content; mods only soft-delete;
-- pinning only via toggle_pin(); deleted messages are immutable.
create or replace function public.enforce_message_updates()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  am_mod boolean := coalesce(public.role_rank((select role from public.profiles where id = me)) >= 2, false);
begin
  if old.deleted_at is not null then
    raise exception 'Deleted messages cannot be changed';
  end if;

  if new.deleted_at is not null then
    if me is distinct from old.sender_id
       and not (old.room_id is not null and am_mod) then
      raise exception 'Not allowed to delete this message';
    end if;
    new.content := '';
    new.mentions := '{}';
    return new;
  end if;

  if new.content is distinct from old.content then
    if me is distinct from old.sender_id then
      raise exception 'You can only edit your own messages';
    end if;
    new.edited_at := now();
    new.mentions := public.extract_mentions(new.content);
  end if;

  if new.pinned is distinct from old.pinned
     and coalesce(current_setting('app.pin_change', true), '') <> 'granted' then
    raise exception 'Use toggle_pin() to pin or unpin messages';
  end if;

  return new;
end $$;

drop trigger if exists enforce_message_updates_trg on public.messages;
create trigger enforce_message_updates_trg
  before update on public.messages
  for each row execute function public.enforce_message_updates();

-- Pin / unpin room messages (Moderator and above).
create or replace function public.toggle_pin(msg_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare m record; newval boolean;
begin
  select * into m from public.messages where id = msg_id;
  if not found then raise exception 'Message not found'; end if;
  if m.conversation_id is not null then raise exception 'Only room messages can be pinned'; end if;
  if m.deleted_at is not null then raise exception 'Message is deleted'; end if;
  if public.role_rank(public.my_role()) < 2 then
    raise exception 'Moderator or higher is required to pin messages';
  end if;
  newval := not m.pinned;
  perform set_config('app.pin_change', 'granted', true);
  update public.messages set pinned = newval where id = msg_id;
  return newval;
end $$;

revoke all on function public.toggle_pin from anon;

-- ============================================================================
-- 6. REACTIONS
-- ============================================================================
create table if not exists public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists reactions_message_idx on public.reactions (message_id);

alter table public.reactions enable row level security;

drop policy if exists "read reactions in scope" on public.reactions;
create policy "read reactions in scope"
  on public.reactions for select to authenticated
  using (exists (
    select 1 from public.messages m
    where m.id = message_id
      and ((m.room_id is not null) or public.is_dm_participant(m.conversation_id))
  ));

drop policy if exists "react to messages" on public.reactions;
create policy "react to messages"
  on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and m.deleted_at is null
        and ((m.room_id is not null) or public.is_dm_participant(m.conversation_id))
    )
  );

drop policy if exists "remove own reaction" on public.reactions;
create policy "remove own reaction"
  on public.reactions for delete to authenticated using (user_id = auth.uid());

-- ============================================================================
-- 7. READ STATES (unread badges + seen receipts)
-- ============================================================================
create table if not exists public.dm_read_states (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.room_read_states (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.dm_read_states enable row level security;
alter table public.room_read_states enable row level security;

drop policy if exists "read dm read states" on public.dm_read_states;
create policy "read dm read states"
  on public.dm_read_states for select to authenticated
  using (user_id = auth.uid() or public.is_dm_participant(conversation_id));

drop policy if exists "write own dm read state" on public.dm_read_states;
create policy "write own dm read state"
  on public.dm_read_states for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own dm read state" on public.dm_read_states;
create policy "update own dm read state"
  on public.dm_read_states for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "write own room read state" on public.room_read_states;
create policy "write own room read state"
  on public.room_read_states for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "read own room read state" on public.room_read_states;
create policy "read own room read state"
  on public.room_read_states for select to authenticated using (user_id = auth.uid());

drop policy if exists "update own room read state" on public.room_read_states;
create policy "update own room read state"
  on public.room_read_states for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.mark_room_read(p_room_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.room_read_states (room_id, user_id, last_read_at)
  values (p_room_id, auth.uid(), now())
  on conflict (room_id, user_id) do update set last_read_at = now();
$$;

create or replace function public.mark_dm_read(p_conversation_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.dm_read_states (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
$$;

revoke all on function public.mark_room_read from anon;
revoke all on function public.mark_dm_read from anon;

-- Rich DM inbox for the Chats tab. (Defined here — after messages and
-- dm_read_states exist — because PostgreSQL validates SQL function bodies
-- at creation time; a forward reference would fail the whole script.)
create or replace function public.my_dms()
returns table (
  conversation_id uuid,
  other_id uuid,
  other_display_name text,
  other_username text,
  other_avatar text,
  last_message text,
  last_at timestamptz,
  last_sender uuid,
  unread bigint,
  other_last_read timestamptz
) language sql stable security definer set search_path = public as $$
  with mine as (
    select p.conversation_id from public.dm_participants p where p.user_id = auth.uid()
  ),
  others as (
    select m.conversation_id, m.user_id as other_id
    from public.dm_participants m
    join mine on mine.conversation_id = m.conversation_id
    where m.user_id <> auth.uid()
  ),
  last_msg as (
    select m.conversation_id, m.content, m.created_at, m.sender_id,
           row_number() over (partition by m.conversation_id order by m.created_at desc) as rn
    from public.messages m
    where m.conversation_id in (select conversation_id from mine) and m.deleted_at is null
  )
  select
    o.conversation_id,
    o.other_id,
    pr.display_name,
    pr.username,
    pr.avatar_url,
    lm.content,
    lm.created_at,
    lm.sender_id,
    (select count(*) from public.messages mm
      where mm.conversation_id = o.conversation_id
        and mm.sender_id <> auth.uid()
        and mm.deleted_at is null
        and mm.created_at > coalesce((
          select s.last_read_at from public.dm_read_states s
          where s.conversation_id = o.conversation_id and s.user_id = auth.uid()
        ), to_timestamp(0))),
    (select s.last_read_at from public.dm_read_states s
      where s.conversation_id = o.conversation_id and s.user_id = o.other_id)
  from others o
  join public.profiles pr on pr.id = o.other_id
  left join last_msg lm on lm.conversation_id = o.conversation_id and lm.rn = 1
  order by lm.created_at desc nulls last;
$$;

revoke all on function public.my_dms from anon;

-- Per-chat unread counts for the Chats tab.
create or replace function public.unread_counts()
returns table (room_id uuid, conversation_id uuid, unread bigint, last_activity timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, null::uuid,
    (select count(*) from public.messages m
      where m.room_id = r.id and m.sender_id <> auth.uid() and m.deleted_at is null
        and m.created_at > coalesce((
          select s.last_read_at from public.room_read_states s
          where s.room_id = r.id and s.user_id = auth.uid()
        ), to_timestamp(0))),
    (select max(created_at) from public.messages m where m.room_id = r.id)
  from public.rooms r
  union all
  select null::uuid, c.id,
    (select count(*) from public.messages m
      where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.deleted_at is null
        and m.created_at > coalesce((
          select s.last_read_at from public.dm_read_states s
          where s.conversation_id = c.id and s.user_id = auth.uid()
        ), to_timestamp(0))),
    (select max(created_at) from public.messages m where m.conversation_id = c.id)
  from public.dm_conversations c
  where exists (
      select 1 from public.dm_participants p
      where p.conversation_id = c.id and p.user_id = auth.uid()
    )
    and exists (select 1 from public.messages m where m.conversation_id = c.id);
$$;

revoke all on function public.unread_counts from anon;

-- Message search within a chat.
create or replace function public.search_messages(p_room_id uuid, p_conversation_id uuid, p_q text)
returns setof public.messages
language sql stable security definer set search_path = public as $$
  select * from public.messages
  where deleted_at is null
    and content ilike '%' || p_q || '%'
    and ((p_room_id is not null and room_id = p_room_id)
      or (p_conversation_id is not null and conversation_id = p_conversation_id))
  order by created_at desc
  limit 50;
$$;

revoke all on function public.search_messages from anon;

-- ============================================================================
-- 8. NOTIFICATIONS
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('dm','mention')),
  title text not null,
  body text not null default '',
  conversation_id uuid,
  room_id uuid,
  message_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications"
  on public.notifications for select to authenticated using (auth.uid() = user_id);

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notify DM recipients and mentioned members on new messages.
create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  targets uuid[];
  sender_name text;
  room_name text;
begin
  select display_name into sender_name from public.profiles where id = new.sender_id;

  if new.conversation_id is not null then
    select array_agg(user_id) into targets
    from public.dm_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id;
  else
    targets := new.mentions;
    select name into room_name from public.rooms where id = new.room_id;
  end if;

  if targets is null or cardinality(targets) = 0 then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, conversation_id, room_id, message_id)
  select t,
    case when new.conversation_id is not null then 'dm' else 'mention' end,
    case
      when new.conversation_id is not null then coalesce(sender_name, 'New message')
      else coalesce(sender_name, 'Someone') || ' • ' || coalesce(room_name, 'Room')
    end,
    left(new.content, 200),
    new.conversation_id,
    new.room_id,
    new.id
  from unnest(targets) as t;

  return new;
end $$;

drop trigger if exists message_notify_trg on public.messages;
create trigger message_notify_trg
  after insert on public.messages
  for each row execute function public.notify_message();

-- ============================================================================
-- 9. PUSH TOKENS
-- ============================================================================
create table if not exists public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text primary key,
  platform text not null,
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "manage own push tokens" on public.push_tokens;
create policy "manage own push tokens"
  on public.push_tokens for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 10. AVATAR STORAGE
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 11. REALTIME
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.dm_read_states;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.room_read_states;
exception when duplicate_object then null; end $$;

-- Realtime must broadcast full row data for RLS-protected tables.
alter table public.messages replica identity full;
alter table public.reactions replica identity full;
alter table public.profiles replica identity full;
alter table public.dm_read_states replica identity full;
alter table public.room_read_states replica identity full;
alter table public.notifications replica identity full;

-- ============================================================================
-- PRIVACY — hard requirements (kept as a living checklist)
-- ============================================================================
-- 1. public.profiles has NO password/phone/email column. Never add one.
-- 2. auth.users (internal addresses + password hashes) is not readable by
--    anon or authenticated roles; only Supabase Auth services access it.
-- 3. All RPCs above return display data only (usernames, display names,
--    avatars). Do not add auth.phone/auth.email joins to them.
-- 4. Realtime publications above expose only public tables, never auth.*.
--
-- ============================================================================
-- DONE. After running this file:
--   • Run schema-v2.sql next (friends, reports, rooms membership,
--     announcements, war, media, moderation, global search).
--   • Dashboard → Authentication → Providers → Email → disable
--     "Confirm email" so registration logs users in immediately.
--   • Start the app, register with username + password, then go to
--     Profile → "Claim Ownership" to become clan Owner.
-- ============================================================================
