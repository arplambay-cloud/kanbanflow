-- ============================================================================
-- Purge inline base64 avatars.
--
-- A single profile photo stored as a `data:` URL is ~1.2 MB of text, and it was
-- also copied into every notifications.sender_avatar and activity_logs.user_avatar
-- row. Measured on this project: profiles 2.36 MB / 2 rows, notifications
-- 4.72 MB / 2 rows, activity_logs 2.36 MB / 3 rows — ~9 MB downloaded, parsed,
-- and written to localStorage on every single page load, which is what made the
-- "Loading workspace..." screen hang.
--
-- Avatars now live in Supabase Storage and the client only ever persists a short
-- URL (see src/utils/avatar.ts). These columns are cleared; the UI falls back to
-- initials until a photo is re-uploaded through the app.
--
-- Safe to re-run.
-- ============================================================================

-- Before: see what is actually stored
--   select 'profiles' t, count(*) filter (where avatar_url like 'data:%') inline,
--          pg_size_pretty(sum(length(coalesce(avatar_url,'')))::bigint) bytes
--     from public.profiles;

update public.profiles
   set avatar_url = '', updated_at = now()
 where avatar_url like 'data:%';

-- These two columns are no longer written at all — the client resolves the
-- avatar from profiles at read time — so clear every value, not just data URLs.
update public.notifications
   set sender_avatar = ''
 where sender_avatar is not null and sender_avatar <> '';

update public.activity_logs
   set user_avatar = ''
 where user_avatar is not null and user_avatar <> '';

-- Stop the columns being refilled by anything that bypasses the client guard.
-- Dropped first so this file stays re-runnable (ADD CONSTRAINT is not idempotent).
alter table public.notifications
  drop constraint if exists notifications_sender_avatar_not_inline;
alter table public.notifications
  add constraint notifications_sender_avatar_not_inline
  check (sender_avatar is null or sender_avatar not like 'data:%') not valid;

alter table public.activity_logs
  drop constraint if exists activity_logs_user_avatar_not_inline;
alter table public.activity_logs
  add constraint activity_logs_user_avatar_not_inline
  check (user_avatar is null or user_avatar not like 'data:%') not valid;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_not_inline;
alter table public.profiles
  add constraint profiles_avatar_url_not_inline
  check (avatar_url is null or avatar_url not like 'data:%') not valid;

-- Validate separately so the ALTERs above take a weaker lock and cannot fail on
-- pre-existing rows if the updates were skipped.
alter table public.notifications validate constraint notifications_sender_avatar_not_inline;
alter table public.activity_logs  validate constraint activity_logs_user_avatar_not_inline;
alter table public.profiles       validate constraint profiles_avatar_url_not_inline;
