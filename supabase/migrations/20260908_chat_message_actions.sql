-- ============================================================================
-- Message actions: reactions, edits, and "delete for me".
--
-- The first cut of chat offered one control — delete for everyone. This adds
-- what people expect next to it: emoji reactions, editing your own message,
-- and hiding a message from your own view without removing it for others.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Edits
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
-- 2. Access helper at message granularity, for the tables that hang off a
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
-- 3. Reactions — one row per (message, user, emoji).
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
-- 4. Delete for me — a per-user hide. The message itself is untouched.
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
-- 5. Unread counts skip messages the caller has hidden.
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
-- 6. Realtime for reactions. Hides are private, so they are not published.
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
