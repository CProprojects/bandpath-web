-- BandPath initial schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > Run).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.

-- ─────────────────────────────────────────────
-- users (profile row, 1:1 with auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  telegram_id text unique,
  name text,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  trial_ends_at timestamptz,
  target_band numeric(2,1),
  exam_date date,
  streak_count int not null default 0,
  last_active_at timestamptz,
  xp_total int not null default 0,
  created_at timestamptz not null default now()
);

-- Columns added after the table's initial creation (CREATE TABLE IF NOT
-- EXISTS is a no-op on existing tables, so these need explicit ALTERs).
alter table public.users add column if not exists xp_total int not null default 0;

alter table public.users enable row level security;

drop policy if exists "users can view own profile" on public.users;
create policy "users can view own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- New auth.users rows automatically get a matching public.users profile,
-- with a 7-day free trial starting at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, full_name, telegram_id, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'telegram_id',
    now() + interval '7 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- test_results
-- ─────────────────────────────────────────────
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  test_id text not null,
  test_type text not null check (test_type in ('reading', 'listening')),
  score_raw int,
  score_band numeric(2,1),
  time_spent_seconds int,
  answers_json jsonb,
  completed_at timestamptz not null default now()
);

create index if not exists test_results_user_id_idx on public.test_results (user_id);

alter table public.test_results enable row level security;

drop policy if exists "users can view own results" on public.test_results;
create policy "users can view own results"
  on public.test_results for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own results" on public.test_results;
create policy "users can insert own results"
  on public.test_results for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- daily_activity
-- ─────────────────────────────────────────────
create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  tests_completed int not null default 0,
  words_reviewed int not null default 0,
  xp_earned int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_activity add column if not exists words_reviewed int not null default 0;
alter table public.daily_activity add column if not exists xp_earned int not null default 0;

create index if not exists daily_activity_user_id_idx on public.daily_activity (user_id);

alter table public.daily_activity enable row level security;

drop policy if exists "users can view own activity" on public.daily_activity;
create policy "users can view own activity"
  on public.daily_activity for select
  using (auth.uid() = user_id);

drop policy if exists "users can upsert own activity" on public.daily_activity;
create policy "users can upsert own activity"
  on public.daily_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own activity" on public.daily_activity;
create policy "users can update own activity"
  on public.daily_activity for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- vocab_progress (per-user spaced-repetition state; word content itself
-- lives in code at src/lib/vocab.ts, keyed by word_id = "<testId>:<word>")
-- ─────────────────────────────────────────────
create table if not exists public.vocab_progress (
  user_id uuid not null references public.users (id) on delete cascade,
  word_id text not null,
  status text not null default 'learning' check (status in ('learning', 'review', 'mastered')),
  interval_days int not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  next_review_at date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create index if not exists vocab_progress_due_idx on public.vocab_progress (user_id, next_review_at);

alter table public.vocab_progress enable row level security;

drop policy if exists "users can view own vocab progress" on public.vocab_progress;
create policy "users can view own vocab progress"
  on public.vocab_progress for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own vocab progress" on public.vocab_progress;
create policy "users can insert own vocab progress"
  on public.vocab_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own vocab progress" on public.vocab_progress;
create policy "users can update own vocab progress"
  on public.vocab_progress for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- subscriptions (written by the Stripe webhook using the service role key,
-- which bypasses RLS — users only get read access here)
-- ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "users can view own subscription" on public.subscriptions;
create policy "users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- telegram_login_sessions — bridges the "bot sends you a code" login flow.
-- Server-only: no RLS policies, only the service role key (which bypasses
-- RLS) may read/write this table. Anonymous/authenticated clients get none.
-- ─────────────────────────────────────────────
create table if not exists public.telegram_login_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  telegram_id text,
  telegram_username text,
  telegram_first_name text,
  code text,
  verified boolean not null default false,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists telegram_login_sessions_token_idx
  on public.telegram_login_sessions (session_token);

alter table public.telegram_login_sessions enable row level security;
