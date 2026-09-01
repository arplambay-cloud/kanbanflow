-- ============================================================================
-- Restore the `avatars` bucket to public.
--
-- The bucket upsert in schema.sql used a literal in its conflict clause:
--
--   on conflict (id) do update set public = false;
--
-- which applied to BOTH rows, overriding the `true` declared for `avatars` in
-- the VALUES list. Because the buckets already existed, that path ran on every
-- execution, so `avatars` was private.
--
-- getPublicUrl() still returns a well-formed URL for a private bucket, but the
-- object 403s — so uploads appeared to succeed while no avatar ever rendered.
-- No data is wrong: the stored avatar_url values are correct and start working
-- again as soon as the bucket is public.
--
-- Safe to re-run.
-- ============================================================================

update storage.buckets set public = true  where id = 'avatars';
update storage.buckets set public = false where id = 'attachments';

-- Confirm:
--   select id, public from storage.buckets where id in ('avatars','attachments');
--   expected: avatars = true, attachments = false
