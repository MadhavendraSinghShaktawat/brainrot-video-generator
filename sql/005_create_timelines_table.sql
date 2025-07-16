-- 005_create_timelines_table.sql
-- Creates the timelines table to store JSON Edit Decision Lists.
-- Run via Supabase migration CLI or psql.

create table if not exists public.timelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_timelines_user on public.timelines (user_id);

-- RLS
alter table public.timelines enable row level security;

create policy "Users can manage their own timelines" on public.timelines
  for all using (auth.uid() = user_id); 