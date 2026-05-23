-- UW Triage prototype: flows + published snapshots (JSON documents)

create table if not exists public.flows (
  id text primary key,
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.published_snapshots (
  id text primary key,
  flow_id text not null references public.flows (id) on delete cascade,
  document jsonb not null,
  publish_scope text not null,
  published_at timestamptz not null default now()
);

create index if not exists flows_updated_at_idx on public.flows (updated_at desc);
create index if not exists published_snapshots_flow_id_idx on public.published_snapshots (flow_id);
create index if not exists published_snapshots_scope_idx on public.published_snapshots (publish_scope);

-- Prototype: open read for public KB; server uses service role for writes.
alter table public.flows enable row level security;
alter table public.published_snapshots enable row level security;

create policy "flows_read_all"
  on public.flows for select
  using (true);

create policy "snapshots_read_all"
  on public.published_snapshots for select
  using (true);
