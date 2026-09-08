-- ============================================================================
-- Replace Clients with Chat.
--
-- Clients never earned their keep here: the workspace has no client rows and no
-- task ever referenced one, so the table and tasks.client_id go. In their place
-- the team gets messaging — one shared group channel that everybody is in, and
-- direct messages between any two members.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Remove clients
-- ---------------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_client_fk;
drop index if exists public.idx_tasks_client_id;
alter table public.tasks drop column if exists client_id;
drop table if exists public.clients cascade;

-- ---------------------------------------------------------------------------
-- 2. Channels
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
-- 3. Messages
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
-- 4. Read markers — one per (channel, user); drives the unread badges.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_reads (
  channel_id text references public.chat_channels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (channel_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. Access helper. SECURITY DEFINER so the messages policies can consult
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
-- 6. Unread counts for the caller, per channel. SECURITY INVOKER on purpose:
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
-- 7. Row level security
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
-- 8. The default group. Every member is implicitly in it.
-- ---------------------------------------------------------------------------
insert into public.chat_channels (id, workspace_id, kind, name)
values ('general', 'ws-default', 'group', 'general')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9. Realtime.
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
