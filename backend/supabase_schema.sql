create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  field_label text not null,
  district_id text not null,
  crop_id text not null,
  growth_stage text not null,
  advisory_result jsonb not null default '{}'::jsonb,
  crop_analysis_result jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table observations enable row level security;

create policy "Service role full access"
  on observations
  for all
  using (true)
  with check (true);

