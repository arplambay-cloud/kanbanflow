-- Board-level card ordering.
--
-- Columns previously rendered purely by the hand-arranged `tasks.order`, so a
-- high-priority card added after a medium one sat below it and every new task
-- landed at the bottom. A board can now choose to derive the order instead.
--
-- 'manual'   – drag-and-drop order (unchanged behaviour, and the default)
-- 'priority' – urgent > high > medium > low, newest first within a priority
-- 'newest'   – most recently created first
--
-- Idempotent: safe to re-run.

alter table public.boards
  add column if not exists sort_mode text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'boards_sort_mode_check'
  ) then
    alter table public.boards
      add constraint boards_sort_mode_check
      check (sort_mode in ('manual', 'priority', 'newest'));
  end if;
end $$;
