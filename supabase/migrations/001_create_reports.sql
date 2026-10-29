create table if not exists public.reports (
  slug text primary key,
  topic text not null,
  source_filename text not null,
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create index if not exists reports_created_at_idx on public.reports (created_at desc);

-- Reports are accessed only by server code using the service role. Keep the
-- client roles without table privileges; RLS denies them even if a privilege is
-- granted elsewhere.
revoke all privileges on table public.reports from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert on table public.reports to service_role;
