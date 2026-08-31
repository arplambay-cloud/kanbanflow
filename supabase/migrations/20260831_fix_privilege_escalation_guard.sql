-- ============================================================================
-- CRITICAL FIX: the privilege-escalation guard was inert.
--
-- prevent_role_self_escalation() is SECURITY DEFINER and owned by `postgres`.
-- Inside such a function `current_user` is ALWAYS the function owner, never the
-- caller — so `current_user in ('postgres','service_role','supabase_admin')`
-- evaluated to true on every call and the guard returned NEW unconditionally.
-- Any authenticated user could promote themselves to admin.
--
-- Correct signals:
--   session_user  -> the real login role ('postgres' for the SQL editor and
--                    migrations; 'authenticator' for PostgREST requests)
--   auth.role()   -> the JWT's role claim, which GoTrue signs and a client
--                    cannot forge ('service_role' for the serverless API)
-- ============================================================================

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then

    -- Direct superuser access (SQL editor, migrations) — note session_user,
    -- NOT current_user, which is meaningless inside SECURITY DEFINER.
    if session_user in ('postgres', 'supabase_admin') then
      return new;
    end if;

    -- The serverless admin API, authenticated with the service-role key.
    -- Read from the signed JWT; a client cannot forge these claims.
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

    raise exception 'Unauthorized: Only workspace admins may change member roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
