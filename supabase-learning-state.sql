-- PeakPoint learning state storage
-- Run this once in the Supabase SQL editor for the PeakPoint project.

create table if not exists public.learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.learning_state enable row level security;

create policy "Users can read their own learning state"
  on public.learning_state
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own learning state"
  on public.learning_state
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own learning state"
  on public.learning_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_learning_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_learning_state_updated_at on public.learning_state;

create trigger set_learning_state_updated_at
before update on public.learning_state
for each row
execute function public.set_learning_state_updated_at();
