-- ============================================================================
-- Make "has this workspace been set up?" a property of the workspace.
--
-- OnboardingModal decided this from localStorage (`kf_onboarding_completed_v3`)
-- and showed the wizard to anyone whose role was not 'member'. localStorage is
-- per-browser, so every *invited admin* arrived with an empty flag and was
-- walked through "Workspace Quick Setup" on their first login — and finishing
-- it calls updateWorkspace(), which overwrote the team's real workspace name,
-- description and accent colour with the wizard's defaults. The same thing
-- happened to the owner on a second device or after clearing site data.
--
-- The flag belongs next to the thing it describes, where every member of the
-- workspace reads the same value.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.workspaces
  add column if not exists onboarded_at timestamp with time zone;

-- Backfill workspaces that are demonstrably already in use, so existing
-- deployments do not show the wizard to anybody after this migration.
--
-- "In use" = it owns a board, or its name is no longer the seeded default.
-- A freshly seeded workspace matches neither and stays null, so a genuinely
-- new install still gets its one-time setup.
update public.workspaces w
   set onboarded_at = coalesce(w.updated_at, w.created_at, now())
 where w.onboarded_at is null
   and (
     exists (select 1 from public.boards b where b.workspace_id = w.id)
     or w.name is distinct from 'My Workspace'
   );
