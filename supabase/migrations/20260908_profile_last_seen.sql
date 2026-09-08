-- ============================================================================
-- Presence: when was each member last seen.
--
-- "Online" itself comes from Realtime Presence and needs no storage. This
-- column is for everyone who was not connected at the moment a teammate went
-- offline: the client heartbeats it once a minute while signed in, so a DM
-- header can say "Last seen 3m ago" instead of nothing.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists last_seen_at timestamp with time zone;
