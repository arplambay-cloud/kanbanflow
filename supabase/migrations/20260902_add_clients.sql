-- ============================================================================
-- Clients
--
-- Client names were being encoded into task titles ("MC Mortgages (Client Work)
-- - Developer Audit", "Red Soda Mock", "checks.co.uk Site Audit") because there
-- was nowhere else to put them. This gives them a first-class home so work can
-- be grouped and filtered per client.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.clients (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade default 'ws-default',
  name text not null,
  color text default '#7c3bed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- A task belongs to at most one client. SET NULL, not CASCADE: removing a
-- client must never delete the work done for them.
alter table public.tasks
  add column if not exists client_id text;

alter table public.tasks
  drop constraint if exists tasks_client_fk;
alter table public.tasks
  add constraint tasks_client_fk
  foreign key (client_id) references public.clients(id) on delete set null;

create index if not exists idx_tasks_client_id on public.tasks(client_id);
create index if not exists idx_clients_workspace_id on public.clients(workspace_id);

-- ---------------------------------------------------------------------------
-- RLS: same shape as boards - members collaborate, only admins can delete.
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;

drop policy if exists "Members read clients" on public.clients;
drop policy if exists "Members create clients" on public.clients;
drop policy if exists "Members update clients" on public.clients;
drop policy if exists "Admins delete clients" on public.clients;

create policy "Members read clients" on public.clients
  for select using (auth.role() = 'authenticated');
create policy "Members create clients" on public.clients
  for insert with check (auth.role() = 'authenticated');
create policy "Members update clients" on public.clients
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins delete clients" on public.clients
  for delete using (public.is_admin());
