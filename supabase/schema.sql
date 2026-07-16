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
  question_results_json jsonb,
  completed_at timestamptz not null default now()
);

alter table public.test_results add column if not exists question_results_json jsonb;

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
-- writing_submissions
-- ─────────────────────────────────────────────
create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  test_id text not null,
  task1_response text not null default '',
  task2_response text not null default '',
  task1_word_count int not null default 0,
  task2_word_count int not null default 0,
  time_spent_seconds int,
  status text not null default 'grading' check (status in ('grading', 'graded', 'failed')),
  task1_band numeric(2,1),
  task2_band numeric(2,1),
  overall_band numeric(2,1),
  task1_feedback jsonb,
  task2_feedback jsonb,
  completed_at timestamptz not null default now(),
  graded_at timestamptz
);

create index if not exists writing_submissions_user_id_idx on public.writing_submissions (user_id);

alter table public.writing_submissions enable row level security;

drop policy if exists "users can view own writing submissions" on public.writing_submissions;
create policy "users can view own writing submissions"
  on public.writing_submissions for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own writing submissions" on public.writing_submissions;
create policy "users can insert own writing submissions"
  on public.writing_submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own writing submissions" on public.writing_submissions;
create policy "users can update own writing submissions"
  on public.writing_submissions for update
  using (auth.uid() = user_id);

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
  xp_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

alter table public.vocab_progress add column if not exists xp_awarded boolean not null default false;

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

-- ─────────────────────────────────────────────
-- telegram_vocab_sessions — tracks a user's in-progress Learn/Quiz/Spelling
-- vocab session inside the Telegram bot between stateless webhook calls.
-- One row per user (Telegram is one active chat per user). Server-only:
-- no RLS policies, only the service role key may read/write this table.
-- ─────────────────────────────────────────────
create table if not exists public.telegram_vocab_sessions (
  user_id uuid primary key references public.users (id) on delete cascade,
  chat_id text not null,
  word_ids text[] not null,
  stage text not null default 'learn' check (stage in ('learn', 'quiz', 'spelling')),
  index int not null default 0,
  quiz_option_ids text[],
  card_message_id bigint,
  session_xp int not null default 0,
  session_mastered int not null default 0,
  session_correct_spelling int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.telegram_vocab_sessions enable row level security;

-- ─────────────────────────────────────────────
-- feedback — free-text "Contact Us" submissions (feedback or problem
-- reports) from either the Telegram bot or the website platform, with an
-- optional attached photo (platform submissions host it in Supabase
-- Storage; Telegram submissions relay the original photo directly via
-- copyMessage, so photo_url stays null for those). Always forwarded
-- (best-effort) to the site owner's personal Telegram chat
-- (ADMIN_TELEGRAM_CHAT_ID); this table is the source of truth regardless of
-- whether that notification succeeds. Server-only: no RLS policies, only
-- the service role key may read/write.
-- ─────────────────────────────────────────────
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('telegram', 'platform')),
  type text not null default 'feedback' check (type in ('feedback', 'report')),
  user_id uuid references public.users (id) on delete set null,
  telegram_id text,
  telegram_username text,
  message text not null default '',
  photo_url text,
  reply_message text,
  reply_photo_url text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.feedback add column if not exists type text not null default 'feedback' check (type in ('feedback', 'report'));
alter table public.feedback add column if not exists photo_url text;
alter table public.feedback add column if not exists reply_message text;
alter table public.feedback add column if not exists reply_photo_url text;
alter table public.feedback add column if not exists replied_at timestamptz;

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- ─────────────────────────────────────────────
-- telegram_feedback_pending — marks a chat as "awaiting contact content"
-- after the user taps "Contact Us" and picks a category (Report/Feedback)
-- in the main menu, so the next message from that chat (text, photo, or
-- both) is captured as that contact submission instead of falling through
-- to the vocab spelling-reply handler. One row per chat, self-expiring
-- after 15 minutes. Server-only: no RLS policies, only the service role key
-- may read/write.
-- ─────────────────────────────────────────────
create table if not exists public.telegram_feedback_pending (
  chat_id text primary key,
  telegram_id text,
  telegram_username text,
  telegram_first_name text,
  type text not null default 'feedback' check (type in ('feedback', 'report')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

alter table public.telegram_feedback_pending add column if not exists type text not null default 'feedback' check (type in ('feedback', 'report'));

alter table public.telegram_feedback_pending enable row level security;

-- ─────────────────────────────────────────────
-- admin_reply_pending — marks the site owner's own Telegram chat as
-- "awaiting a reply message" after they tap the "↩️ Reply" button on a
-- forwarded feedback/report, so their next plain-text message is relayed to
-- that submitter's Telegram chat instead of being treated as anything else.
-- One row per chat (in practice always the admin's), self-expiring after 15
-- minutes. Server-only: no RLS policies, only the service role key may
-- read/write.
-- ─────────────────────────────────────────────
create table if not exists public.admin_reply_pending (
  chat_id text primary key,
  feedback_id uuid not null references public.feedback (id) on delete cascade,
  target_telegram_id text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

alter table public.admin_reply_pending enable row level security;
