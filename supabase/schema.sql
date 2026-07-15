-- PeakPoint SAT Prep data foundation
-- Run in the Supabase SQL editor after enabling Supabase Auth.
-- This keeps student data protected with row-level security and leaves Gemini access server-side.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  target_score int,
  test_date date,
  xp int not null default 0,
  best_combo int not null default 0,
  diagnostic_done boolean not null default false,
  mastery jsonb not null default '{}'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists target_score int,
  add column if not exists test_date date,
  add column if not exists xp int not null default 0,
  add column if not exists best_combo int not null default 0,
  add column if not exists diagnostic_done boolean not null default false,
  add column if not exists mastery jsonb not null default '{}'::jsonb,
  add column if not exists badges jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  qid text not null,
  skill text not null,
  section text not null check (section in ('math', 'rw', 'vocab')),
  difficulty text,
  correct boolean not null,
  selected_answer text,
  correct_answer text,
  elapsed_seconds int,
  hint_count int not null default 0,
  completion_status text not null default 'answered',
  domain text,
  question_type text,
  source_type text not null default 'peakpoint-original',
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_created_idx on public.attempts(user_id, created_at desc);
create index if not exists attempts_user_skill_idx on public.attempts(user_id, skill);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  skill text,
  total int not null default 0,
  correct int not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_created_idx on public.sessions(user_id, created_at desc);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  math int not null,
  rw int not null,
  total int generated always as (math + rw) stored,
  confidence text,
  range_low int,
  range_high int,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_user_created_idx on public.snapshots(user_id, created_at desc);

create table if not exists public.learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null,
  context_id text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_conversations_user_idx on public.tutor_conversations(user_id, updated_at desc);

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  qid text not null,
  issue text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_generated_questions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  subject text not null,
  domain text not null,
  skill text not null,
  difficulty text not null,
  question_type text not null,
  prompt text not null,
  passage text,
  choices jsonb not null,
  correct_answer text not null,
  explanation text not null,
  estimated_seconds int not null default 75,
  source_type text not null default 'ai-generated',
  quality_notes text,
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists admin_generated_questions_status_idx on public.admin_generated_questions(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists learning_state_set_updated_at on public.learning_state;
create trigger learning_state_set_updated_at
before update on public.learning_state
for each row execute function public.set_updated_at();

drop trigger if exists tutor_conversations_set_updated_at on public.tutor_conversations;
create trigger tutor_conversations_set_updated_at
before update on public.tutor_conversations
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.sessions enable row level security;
alter table public.snapshots enable row level security;
alter table public.learning_state enable row level security;
alter table public.tutor_conversations enable row level security;
alter table public.question_reports enable row level security;
alter table public.admin_generated_questions enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_owner_upsert on public.profiles;
create policy profiles_owner_upsert on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists attempts_owner_all on public.attempts;
create policy attempts_owner_all on public.attempts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists sessions_owner_all on public.sessions;
create policy sessions_owner_all on public.sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists snapshots_owner_all on public.snapshots;
create policy snapshots_owner_all on public.snapshots
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists learning_state_owner_all on public.learning_state;
create policy learning_state_owner_all on public.learning_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tutor_conversations_owner_all on public.tutor_conversations;
create policy tutor_conversations_owner_all on public.tutor_conversations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists question_reports_owner_all on public.question_reports;
create policy question_reports_owner_all on public.question_reports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Published AI-generated questions can be read by signed-in students.
drop policy if exists generated_questions_students_read_approved on public.admin_generated_questions;
create policy generated_questions_students_read_approved on public.admin_generated_questions
for select using (auth.role() = 'authenticated' and status = 'approved');

-- Admin writes should go through the secure server with a verified admin user.
-- If you also manage admins directly in Supabase, create a custom claim role='admin'.
drop policy if exists generated_questions_admin_all on public.admin_generated_questions;
create policy generated_questions_admin_all on public.admin_generated_questions
for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
