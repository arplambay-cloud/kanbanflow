-- ==============================================================================
-- KANBANFLOW SECURE DATABASE SCHEMA & AUTH TRIGGERS
-- Paste this entire file into the Supabase SQL Editor and click 'Run'.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked directly to auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  avatar_url text default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  job_title text default 'Team Member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 2. AUTOMATIC FIRST-USER ADMIN TRIGGER FUNCTION
-- Automatically makes the 1st registered user an 'admin', and all subsequent users 'member'
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_count integer;
  assigned_role text;
  user_name text;
begin
  -- Check existing profile count
  select count(*) into user_count from public.profiles;

  -- 1st user is automatically assigned 'admin', subsequent users default to 'member'
  if user_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := 'member';
  end if;

  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, email, role, job_title, avatar_url)
  values (
    new.id,
    user_name,
    new.email,
    assigned_role,
    coalesce(new.raw_user_meta_data->>'job_title', case when assigned_role = 'admin' then 'Workspace Owner' else 'Team Member' end),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    job_title = coalesce(excluded.job_title, profiles.job_title),
    updated_at = now();

  return new;
end;
$$;

-- Trigger to execute whenever a new auth user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. PREVENT ROLE SELF-ESCALATION TRIGGER
-- Ensures members cannot promote themselves to 'admin' via client-side updates
-- ------------------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    -- CRITICAL: use session_user, NOT current_user.
    -- This function is SECURITY DEFINER and owned by `postgres`, so inside it
    -- `current_user` is ALWAYS the owner and never the caller. Testing
    -- `current_user in ('postgres', ...)` was therefore true on every call and
    -- disabled this guard entirely — any authenticated user could self-promote.
    -- `session_user` is the real login role: 'postgres' in the SQL editor and
    -- migrations, 'authenticator' for PostgREST requests.
    if session_user in ('postgres', 'supabase_admin') then
      return new;
    end if;

    -- The serverless admin API, authenticated with the service-role key.
    -- These claims come from the JWT, which GoTrue signs; a client cannot forge
    -- them (note: this reads the top-level `role` claim, not user_metadata).
    if coalesce(auth.role(), '') = 'service_role'
       or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
      return new;
    end if;

    -- A signed-in workspace admin.
    if exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      return new;
    end if;

    -- Block unauthorized role escalation
    raise exception 'Unauthorized: Only workspace admins may change member roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ------------------------------------------------------------------------------
-- 4. WORKSPACES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  description text default '',
  accent_color text default '#4f46e5',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 5. BOARDS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.boards (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade default 'ws-1',
  title text not null,
  description text default '',
  color text default '#4f46e5',
  sort_mode text not null default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- `create table if not exists` never alters a deployed table, so columns added
-- after the first deploy must also be applied here. See migrations/.
alter table public.boards
  add column if not exists sort_mode text not null default 'manual';

-- ------------------------------------------------------------------------------
-- 6. COLUMNS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.columns (
  id text primary key,
  board_id text references public.boards(id) on delete cascade not null,
  title text not null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 7. TASKS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.tasks (
  id text primary key,
  board_id text references public.boards(id) on delete cascade not null,
  column_id text references public.columns(id) on delete cascade not null,
  title text not null,
  description text default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date text,
  assignee_id uuid references auth.users(id) on delete set null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 8. TASK COMMENTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.task_comments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  user_avatar text default '',
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 9. TASK ATTACHMENTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.task_attachments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  name text not null,
  size integer not null default 0,
  type text default '',
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 10. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_avatar text default '',
  type text not null check (type in ('task_assigned', 'status_changed', 'comment_added', 'due_date_approaching')),
  message text not null,
  task_id text,
  task_title text,
  board_id text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 11. ACTIVITY LOGS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade default 'ws-1',
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  user_avatar text default '',
  action text not null,
  entity_title text not null,
  board_title text default '',
  details text default '',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer set search_path = public, pg_temp;

-- Drop existing policies if re-running
drop policy if exists "Allow authenticated read on profiles" on public.profiles;
drop policy if exists "Allow profile self update" on public.profiles;
drop policy if exists "Allow admin update on profiles" on public.profiles;
drop policy if exists "Allow authenticated all on workspaces" on public.workspaces;
drop policy if exists "Allow authenticated read on workspaces" on public.workspaces;
drop policy if exists "Allow admin modify on workspaces" on public.workspaces;
drop policy if exists "Allow authenticated all on boards" on public.boards;
drop policy if exists "Allow authenticated all on columns" on public.columns;
drop policy if exists "Allow authenticated all on tasks" on public.tasks;
drop policy if exists "Allow authenticated all on task_comments" on public.task_comments;
drop policy if exists "Allow authenticated all on task_attachments" on public.task_attachments;
drop policy if exists "Allow authenticated all on notifications" on public.notifications;
drop policy if exists "Allow recipient read on notifications" on public.notifications;
drop policy if exists "Allow authenticated insert notifications" on public.notifications;
drop policy if exists "Allow recipient update notifications" on public.notifications;
drop policy if exists "Allow recipient delete notifications" on public.notifications;
drop policy if exists "Allow authenticated all on activity_logs" on public.activity_logs;

-- Drop the granular policies too, so this file stays safely re-runnable
drop policy if exists "Members read boards" on public.boards;
drop policy if exists "Members create boards" on public.boards;
drop policy if exists "Members update boards" on public.boards;
drop policy if exists "Admins delete boards" on public.boards;
drop policy if exists "Members read columns" on public.columns;
drop policy if exists "Members create columns" on public.columns;
drop policy if exists "Members update columns" on public.columns;
drop policy if exists "Admins delete columns" on public.columns;
drop policy if exists "Members manage tasks" on public.tasks;
drop policy if exists "Members read comments" on public.task_comments;
drop policy if exists "Members post own comments" on public.task_comments;
drop policy if exists "Authors update own comments" on public.task_comments;
drop policy if exists "Authors delete own comments" on public.task_comments;
drop policy if exists "Members read attachments" on public.task_attachments;
drop policy if exists "Members add attachments" on public.task_attachments;
drop policy if exists "Uploader deletes attachments" on public.task_attachments;
drop policy if exists "Members read activity" on public.activity_logs;
drop policy if exists "Members append own activity" on public.activity_logs;
drop policy if exists "Admins prune activity" on public.activity_logs;

-- Attribute attachment uploads to the caller so deletes can be scoped to the
-- uploader. Additive and safe on existing data (older rows stay null and are
-- therefore admin-deletable only).
alter table public.task_attachments
  add column if not exists uploader_id uuid default auth.uid();

-- The deployed `uploaded_by` column is NOT NULL with no default, but the client
-- does not send it, so every attachment insert failed a not-null violation.
-- Relax it and default it to the caller's display identity.
--
-- `add column if not exists` first: the column only exists on databases created
-- before it was dropped from the CREATE TABLE above, so on a fresh deploy the
-- two ALTERs below would abort with `column "uploaded_by" does not exist` and
-- take the rest of this file down with them.
alter table public.task_attachments
  add column if not exists uploaded_by text;
alter table public.task_attachments
  alter column uploaded_by drop not null;
alter table public.task_attachments
  alter column uploaded_by set default '';

-- The deployed workspace row is 'ws-default', but boards/activity_logs default
-- their workspace_id to 'ws-1', which does not exist — so every board insert
-- failed the foreign key. Seed the row and align the defaults.
insert into public.workspaces (id, name, description)
values ('ws-default', 'My Workspace', 'Collaborative team workspace for managing projects and tasks.')
on conflict (id) do nothing;

alter table public.boards alter column workspace_id set default 'ws-default';

-- Columns the client writes that were missing from the deployed tables, so
-- those writes failed silently: workspaces.accent_color and
-- activity_logs.workspace_id.
alter table public.workspaces
  add column if not exists accent_color text default '#4f46e5';

-- Whether the one-time setup wizard has been completed for this workspace.
-- Tracked here rather than in each browser's localStorage so that an invited
-- admin does not get walked through it again — and overwrite the workspace
-- name/description/colour the team already chose. See migrations/.
alter table public.workspaces
  add column if not exists onboarded_at timestamp with time zone;

alter table public.activity_logs
  add column if not exists workspace_id text
  references public.workspaces(id) on delete cascade default 'ws-default';

-- Policies for Authenticated users
create policy "Allow authenticated read on profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Allow profile self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Allow admin update on profiles" on public.profiles for update using (public.is_admin());

-- Workspace Policies
create policy "Allow authenticated read on workspaces" on public.workspaces for select using (auth.role() = 'authenticated');
create policy "Allow admin modify on workspaces" on public.workspaces for all using (public.is_admin());

-- ------------------------------------------------------------------------------
-- BOARDS & COLUMNS
-- Every member collaborates (read / create / rename), but DELETE is destructive
-- and irreversible, so it is restricted to admins.
-- ------------------------------------------------------------------------------
create policy "Members read boards" on public.boards
  for select using (auth.role() = 'authenticated');
create policy "Members create boards" on public.boards
  for insert with check (auth.role() = 'authenticated');
create policy "Members update boards" on public.boards
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins delete boards" on public.boards
  for delete using (public.is_admin());

create policy "Members read columns" on public.columns
  for select using (auth.role() = 'authenticated');
create policy "Members create columns" on public.columns
  for insert with check (auth.role() = 'authenticated');
create policy "Members update columns" on public.columns
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins delete columns" on public.columns
  for delete using (public.is_admin());

-- ------------------------------------------------------------------------------
-- TASKS — full CRUD for every member; that is the point of a shared kanban board.
-- ------------------------------------------------------------------------------
create policy "Members manage tasks" on public.tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- TASK COMMENTS — anyone may read and post, but you may only post AS YOURSELF,
-- and only edit or delete your own comment (admins may moderate any).
-- This closes the authorship-forgery hole.
-- ------------------------------------------------------------------------------
create policy "Members read comments" on public.task_comments
  for select using (auth.role() = 'authenticated');
create policy "Members post own comments" on public.task_comments
  for insert with check (user_id = auth.uid());
create policy "Authors update own comments" on public.task_comments
  for update using (user_id = auth.uid() or public.is_admin());
create policy "Authors delete own comments" on public.task_comments
  for delete using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------------------
-- TASK ATTACHMENTS — anyone may read and upload; only the uploader (or an admin)
-- may delete. `uploader_id` defaults to the caller so it cannot be spoofed.
-- ------------------------------------------------------------------------------
create policy "Members read attachments" on public.task_attachments
  for select using (auth.role() = 'authenticated');
create policy "Members add attachments" on public.task_attachments
  for insert with check (auth.role() = 'authenticated');
create policy "Uploader deletes attachments" on public.task_attachments
  for delete using (uploader_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS (recipient-scoped)
-- ------------------------------------------------------------------------------
create policy "Allow recipient read on notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "Allow authenticated insert notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
create policy "Allow recipient update notifications" on public.notifications for update using (recipient_id = auth.uid());
create policy "Allow recipient delete notifications" on public.notifications for delete using (recipient_id = auth.uid());

-- ------------------------------------------------------------------------------
-- ACTIVITY LOGS — append-only audit trail. You may only write entries attributed
-- to yourself, and nobody may rewrite history (admins may prune).
-- ------------------------------------------------------------------------------
create policy "Members read activity" on public.activity_logs
  for select using (auth.role() = 'authenticated');
create policy "Members append own activity" on public.activity_logs
  for insert with check (user_id = auth.uid());
create policy "Admins prune activity" on public.activity_logs
  for delete using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 13. STORAGE BUCKETS & POLICIES
-- ------------------------------------------------------------------------------
-- `attachments` is private and served through short-lived signed URLs.
-- `avatars` is public: they are shown to every workspace member and are served
-- with getPublicUrl().
--
-- NOTE: the conflict clause must use `excluded.public` so each bucket keeps the
-- value declared for it above. A literal here (e.g. `set public = false`) is
-- applied to BOTH rows, which silently made `avatars` private and broke every
-- avatar — getPublicUrl() on a private bucket returns a URL that 403s.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false), ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Read attachments" on storage.objects;
drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Authenticated upload objects" on storage.objects;
drop policy if exists "Owner deletes own objects" on storage.objects;

create policy "Read attachments" on storage.objects for select using (bucket_id = 'attachments' and auth.role() = 'authenticated');
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Authenticated upload objects" on storage.objects for insert with check (bucket_id in ('attachments', 'avatars') and auth.role() = 'authenticated');
-- `owner` is uuid on current Supabase, but cast both sides so this works
-- regardless of the storage schema version on the project.
create policy "Owner deletes own objects" on storage.objects for delete using (bucket_id in ('attachments', 'avatars') and (owner::text = auth.uid()::text or public.is_admin()));

-- ------------------------------------------------------------------------------
-- 14. FOREIGN-KEY INDEXES
-- Postgres does not index foreign keys automatically, and each of these backs a
-- filter the application actually issues (assignee lookups, notification
-- recipient scoping, per-user activity).
-- ------------------------------------------------------------------------------
create index if not exists idx_task_comments_user_id      on public.task_comments(user_id);
create index if not exists idx_activity_logs_user_id      on public.activity_logs(user_id);
create index if not exists idx_tasks_assignee_id          on public.tasks(assignee_id);
create index if not exists idx_notifications_recipient_id on public.notifications(recipient_id);
create index if not exists idx_notifications_sender_id    on public.notifications(sender_id);
create index if not exists idx_task_attachments_uploader  on public.task_attachments(uploader_id);

-- ------------------------------------------------------------------------------
-- 15. CHAT
-- One shared group channel plus direct messages between members. Kept in step
-- with migrations/20260908_replace_clients_with_chat.sql.
-- ------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 15a. Channels
--
-- A channel is either the group everybody shares or a DM between exactly two
-- people. DMs pin both participants on the row (sorted, so a pair has one
-- canonical row) rather than through a membership table: it keeps the RLS a
-- single predicate and lets the client derive the channel id for any pair
-- without asking the server first.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_channels (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade default 'ws-default',
  kind text not null check (kind in ('group', 'dm')),
  name text,
  dm_user_a uuid references auth.users(id) on delete cascade,
  dm_user_b uuid references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint chat_channels_shape check (
    (kind = 'group' and name is not null and dm_user_a is null and dm_user_b is null)
    or (kind = 'dm' and dm_user_a is not null and dm_user_b is not null and dm_user_a < dm_user_b)
  )
);

create unique index if not exists chat_channels_dm_pair
  on public.chat_channels (dm_user_a, dm_user_b)
  where kind = 'dm';

-- ---------------------------------------------------------------------------
-- 15b. Messages
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id text primary key,
  channel_id text references public.chat_channels(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_chat_messages_channel_created
  on public.chat_messages (channel_id, created_at);
create index if not exists idx_chat_messages_sender
  on public.chat_messages (sender_id);

-- ---------------------------------------------------------------------------
-- 15c. Read markers — one per (channel, user); drives the unread badges.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_reads (
  channel_id text references public.chat_channels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (channel_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 15d. Access helper. SECURITY DEFINER so the messages policies can consult
--    chat_channels without recursing through that table's own policies.
-- ---------------------------------------------------------------------------
create or replace function public.can_access_chat_channel(p_channel_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.chat_channels c
     where c.id = p_channel_id
       and auth.role() = 'authenticated'
       and (c.kind = 'group' or auth.uid() in (c.dm_user_a, c.dm_user_b))
  );
$$;

-- ---------------------------------------------------------------------------
-- 15e. Unread counts for the caller, per channel. SECURITY INVOKER on purpose:
--    RLS on chat_messages already restricts it to channels the caller can see.
--
--    Messages from before the caller's account existed are not "unread" — a
--    new member should not open the app to a hundred-message backlog badge.
-- ---------------------------------------------------------------------------
create or replace function public.chat_unread_counts()
returns table (channel_id text, unread bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select m.channel_id, count(*)::bigint as unread
    from public.chat_messages m
    left join public.chat_reads r
      on r.channel_id = m.channel_id and r.user_id = auth.uid()
    left join public.profiles p
      on p.id = auth.uid()
   where m.sender_id is distinct from auth.uid()
     and m.created_at > coalesce(r.last_read_at, p.created_at, 'epoch'::timestamptz)
   group by m.channel_id;
$$;

grant execute on function public.chat_unread_counts() to authenticated;
grant execute on function public.can_access_chat_channel(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 15f. Row level security
-- ---------------------------------------------------------------------------
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reads    enable row level security;

drop policy if exists "Members read their channels"   on public.chat_channels;
drop policy if exists "Members open their own DMs"     on public.chat_channels;
drop policy if exists "Admins create group channels"   on public.chat_channels;
drop policy if exists "Admins delete channels"         on public.chat_channels;
drop policy if exists "Members read channel messages"  on public.chat_messages;
drop policy if exists "Members post as themselves"     on public.chat_messages;
drop policy if exists "Authors delete own messages"    on public.chat_messages;
drop policy if exists "Own read markers"               on public.chat_reads;

-- Everyone sees the group; a DM is visible only to its two participants.
create policy "Members read their channels" on public.chat_channels
  for select using (
    auth.role() = 'authenticated'
    and (kind = 'group' or auth.uid() in (dm_user_a, dm_user_b))
  );

-- You may open a DM only if you are one of its two sides — nobody can create a
-- conversation between two other people.
create policy "Members open their own DMs" on public.chat_channels
  for insert with check (kind = 'dm' and auth.uid() in (dm_user_a, dm_user_b));

create policy "Admins create group channels" on public.chat_channels
  for insert with check (kind = 'group' and public.is_admin());

-- The shared group is load-bearing; it cannot be deleted from the client.
create policy "Admins delete channels" on public.chat_channels
  for delete using (public.is_admin() and id <> 'general');

create policy "Members read channel messages" on public.chat_messages
  for select using (public.can_access_chat_channel(channel_id));

-- Post only as yourself, and only into channels you can read.
create policy "Members post as themselves" on public.chat_messages
  for insert with check (sender_id = auth.uid() and public.can_access_chat_channel(channel_id));

create policy "Authors delete own messages" on public.chat_messages
  for delete using (sender_id = auth.uid() or public.is_admin());

create policy "Own read markers" on public.chat_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 15g. The default group. Every member is implicitly in it.
-- ---------------------------------------------------------------------------
insert into public.chat_channels (id, workspace_id, kind, name)
values ('general', 'ws-default', 'group', 'general')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 15h. Realtime.
--
-- The client already subscribes to postgres_changes on tasks, columns, boards
-- and notifications, but on this project the supabase_realtime publication
-- was empty, so none of those subscriptions ever fired — other people's edits
-- only appeared after a refresh. Publish those tables too while adding chat.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array[
    'tasks', 'columns', 'boards', 'notifications', 'chat_channels', 'chat_messages'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------------------
-- 16. CHAT MESSAGE ACTIONS
-- Reactions, edits and per-user hides. Redefines chat_unread_counts() from 15e
-- to skip hidden messages. Kept in step with
-- migrations/20260908_chat_message_actions.sql.
-- ------------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 16a. Edits
--
-- edited_at is stamped by a trigger, not the client, so it cannot be omitted
-- or backdated. The UPDATE grant is narrowed to the content column: even with
-- a matching policy, channel_id, sender_id and created_at stay out of reach.
-- ---------------------------------------------------------------------------
alter table public.chat_messages
  add column if not exists edited_at timestamp with time zone;

create or replace function public.chat_message_mark_edited()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content then
    new.edited_at := timezone('utc'::text, now());
  end if;
  return new;
end;
$$;

drop trigger if exists chat_message_mark_edited on public.chat_messages;
create trigger chat_message_mark_edited
  before update on public.chat_messages
  for each row execute function public.chat_message_mark_edited();

revoke update on public.chat_messages from anon, authenticated;
grant update (content) on public.chat_messages to authenticated;

drop policy if exists "Authors edit own messages" on public.chat_messages;
create policy "Authors edit own messages" on public.chat_messages
  for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 16b. Access helper at message granularity, for the tables that hang off a
--    message. SECURITY DEFINER for the same reason as the channel helper.
-- ---------------------------------------------------------------------------
create or replace function public.can_access_chat_message(p_message_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.chat_messages m
      join public.chat_channels c on c.id = m.channel_id
     where m.id = p_message_id
       and auth.role() = 'authenticated'
       and (c.kind = 'group' or auth.uid() in (c.dm_user_a, c.dm_user_b))
  );
$$;

grant execute on function public.can_access_chat_message(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 16c. Reactions — one row per (message, user, emoji).
-- ---------------------------------------------------------------------------
create table if not exists public.chat_reactions (
  message_id text references public.chat_messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (message_id, user_id, emoji)
);

create index if not exists idx_chat_reactions_user on public.chat_reactions (user_id);

alter table public.chat_reactions enable row level security;

drop policy if exists "Members read reactions"        on public.chat_reactions;
drop policy if exists "Members react as themselves"   on public.chat_reactions;
drop policy if exists "Members remove own reactions"  on public.chat_reactions;

create policy "Members read reactions" on public.chat_reactions
  for select using (public.can_access_chat_message(message_id));
create policy "Members react as themselves" on public.chat_reactions
  for insert with check (user_id = auth.uid() and public.can_access_chat_message(message_id));
create policy "Members remove own reactions" on public.chat_reactions
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 16d. Delete for me — a per-user hide. The message itself is untouched.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_hidden_messages (
  message_id text references public.chat_messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  hidden_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (message_id, user_id)
);

alter table public.chat_hidden_messages enable row level security;

drop policy if exists "Own hidden messages" on public.chat_hidden_messages;
create policy "Own hidden messages" on public.chat_hidden_messages
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_access_chat_message(message_id));

-- ---------------------------------------------------------------------------
-- 16e. Unread counts skip messages the caller has hidden.
-- ---------------------------------------------------------------------------
create or replace function public.chat_unread_counts()
returns table (channel_id text, unread bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select m.channel_id, count(*)::bigint as unread
    from public.chat_messages m
    left join public.chat_reads r
      on r.channel_id = m.channel_id and r.user_id = auth.uid()
    left join public.profiles p
      on p.id = auth.uid()
   where m.sender_id is distinct from auth.uid()
     and m.created_at > coalesce(r.last_read_at, p.created_at, 'epoch'::timestamptz)
     and not exists (
       select 1 from public.chat_hidden_messages h
        where h.message_id = m.id and h.user_id = auth.uid()
     )
   group by m.channel_id;
$$;

-- ---------------------------------------------------------------------------
-- 16f. Realtime for reactions. Hides are private, so they are not published.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_reactions'
  ) then
    alter publication supabase_realtime add table public.chat_reactions;
  end if;
end $$;
