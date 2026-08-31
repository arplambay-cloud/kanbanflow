-- ============================================================================
-- Convert identity columns from text to uuid, add real foreign keys, and
-- restore the RLS policies using native uuid comparison.
--
-- Preconditions verified: zero non-uuid values, zero orphaned references.
-- Postgres refuses to alter a column a policy depends on, so the dependent
-- policies are dropped and recreated around the conversion.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the policies that depend on the columns being converted
-- ---------------------------------------------------------------------------
drop policy if exists "Members post own comments"   on public.task_comments;
drop policy if exists "Authors update own comments" on public.task_comments;
drop policy if exists "Authors delete own comments" on public.task_comments;
drop policy if exists "Members append own activity" on public.activity_logs;
drop policy if exists "Allow recipient read on notifications"   on public.notifications;
drop policy if exists "Allow recipient update notifications"    on public.notifications;
drop policy if exists "Allow recipient delete notifications"    on public.notifications;

-- ---------------------------------------------------------------------------
-- 2. Type conversion
-- ---------------------------------------------------------------------------
alter table public.task_comments
  alter column user_id drop not null,
  alter column user_id type uuid using nullif(trim(user_id), '')::uuid;

alter table public.activity_logs
  alter column user_id drop not null,
  alter column user_id type uuid using nullif(trim(user_id), '')::uuid;

alter table public.tasks
  alter column assignee_id type uuid using nullif(trim(assignee_id), '')::uuid;

alter table public.notifications
  alter column recipient_id type uuid using nullif(trim(recipient_id), '')::uuid,
  alter column sender_id drop not null,
  alter column sender_id type uuid using nullif(trim(sender_id), '')::uuid;

-- ---------------------------------------------------------------------------
-- 3. Foreign keys
--    SET NULL keeps the record and its denormalised user_name when an account
--    is removed; CASCADE only where the row is meaningless without the user.
-- ---------------------------------------------------------------------------
alter table public.task_comments
  drop constraint if exists task_comments_user_fk;
alter table public.task_comments
  add constraint task_comments_user_fk
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.activity_logs
  drop constraint if exists activity_logs_user_fk;
alter table public.activity_logs
  add constraint activity_logs_user_fk
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.tasks
  drop constraint if exists tasks_assignee_fk;
alter table public.tasks
  add constraint tasks_assignee_fk
  foreign key (assignee_id) references auth.users(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_recipient_fk;
alter table public.notifications
  add constraint notifications_recipient_fk
  foreign key (recipient_id) references auth.users(id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_sender_fk;
alter table public.notifications
  add constraint notifications_sender_fk
  foreign key (sender_id) references auth.users(id) on delete set null;

alter table public.task_attachments
  drop constraint if exists task_attachments_uploader_fk;
alter table public.task_attachments
  add constraint task_attachments_uploader_fk
  foreign key (uploader_id) references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Recreate the policies with native uuid comparison.
--    The ::text casts were a workaround for the type mismatch; they also
--    defeated index usage. Types are now guaranteed, so compare uuid to uuid.
-- ---------------------------------------------------------------------------
create policy "Members post own comments" on public.task_comments
  for insert with check (user_id = auth.uid());
create policy "Authors update own comments" on public.task_comments
  for update using (user_id = auth.uid() or public.is_admin());
create policy "Authors delete own comments" on public.task_comments
  for delete using (user_id = auth.uid() or public.is_admin());

create policy "Members append own activity" on public.activity_logs
  for insert with check (user_id = auth.uid());

create policy "Allow recipient read on notifications" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "Allow recipient update notifications" on public.notifications
  for update using (recipient_id = auth.uid());
create policy "Allow recipient delete notifications" on public.notifications
  for delete using (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Index the new foreign keys. Postgres does not create these automatically,
--    and each one backs a filter the app actually issues.
-- ---------------------------------------------------------------------------
create index if not exists idx_task_comments_user_id      on public.task_comments(user_id);
create index if not exists idx_activity_logs_user_id      on public.activity_logs(user_id);
create index if not exists idx_tasks_assignee_id          on public.tasks(assignee_id);
create index if not exists idx_notifications_recipient_id on public.notifications(recipient_id);
create index if not exists idx_notifications_sender_id    on public.notifications(sender_id);
create index if not exists idx_task_attachments_uploader  on public.task_attachments(uploader_id);
