-- Apply the explicit reports permissions to projects that ran the original
-- migration before these grants were added. These statements are safe to rerun.
alter table if exists public.reports enable row level security;

revoke all privileges on table public.reports from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert on table public.reports to service_role;
