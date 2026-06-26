-- 外贸英语工作台 · Supabase schema
-- Phase 1 installs all tables and RLS from the product spec.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== Owner helper for leads RLS =====
-- Insert your own auth.users.id here after first signup:
-- insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-000000000000');
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ===== 对内 · 练习 =====
create table if not exists public.corpus_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null,
  chinese_intent text,
  english_expression text not null,
  mistake_note text,
  tags text[] default '{}',
  source text,
  mastery int default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  corpus_added int default 0,
  days_completed int default 0,
  emails_written int default 0,
  interpreting_sessions int default 0,
  section_order text[] default '{learned,used,mistakes,hard,next}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, week_start)
);

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.weekly_reviews(id) on delete cascade,
  section text not null,
  content text not null default '',
  position int not null default 0,
  created_at timestamptz default now()
);

create index if not exists review_items_review_section_position_idx
  on public.review_items (review_id, section, position);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  task_type text,
  completed boolean default false,
  minutes_spent int default 0,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, log_date, task_type)
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  content_en text not null,
  content_zh text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists templates_builtin_unique_idx
  on public.templates (category, title, content_en)
  where user_id is null;

create table if not exists public.glossary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  term_en text not null,
  term_zh text not null,
  example text,
  is_favorite boolean default false,
  mastery int default 0,
  created_at timestamptz default now()
);

create unique index if not exists glossary_builtin_unique_idx
  on public.glossary (category, term_en)
  where user_id is null;

create table if not exists public.grammar_points (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_zh text not null,
  priority int not null,
  rules_md text not null,
  examples jsonb default '[]',
  common_mistakes jsonb default '[]'
);

create table if not exists public.grammar_practice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grammar_slug text not null references public.grammar_points(slug) on delete restrict,
  practice_date date not null,
  content text,
  self_score int,
  created_at timestamptz default now()
);

create table if not exists public.roleplay_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  content_en text not null,
  content_zh text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists roleplay_builtin_unique_idx
  on public.roleplay_scripts (category, title)
  where user_id is null;

create table if not exists public.growth_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  type text,
  title text,
  media_url text,
  notes text,
  created_at timestamptz default now()
);

-- ===== 对外 · 运营 =====
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text,
  topic text,
  url text,
  published_at date,
  likes int default 0,
  saves int default 0,
  comments int default 0,
  paid_inquiries int default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.idea_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea text not null,
  source text,
  status text default 'idea',
  linked_corpus_id uuid references public.corpus_entries(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  contact text,
  channel text,
  want text,
  created_at timestamptz default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal_minutes int default 60,
  last_export_at timestamptz,
  created_at timestamptz default now()
);

-- ===== 个人主场 · 扩建 =====
create table if not exists public.site_texts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null,
  content text not null default '',
  updated_at timestamptz default now(),
  unique (user_id, slot)
);

create table if not exists public.jazz_timeline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  title text not null default '',
  note text not null default '',
  video_url text,
  visibility text not null default 'private',
  position int not null default 0,
  created_at timestamptz default now()
);

create index if not exists jazz_timeline_user_date_position_idx
  on public.jazz_timeline (user_id, entry_date desc, position);

create table if not exists public.jazz_compare (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  before_url text,
  after_url text,
  visibility text not null default 'private',
  created_at timestamptz default now()
);

create table if not exists public.jazz_inspiration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_url text,
  note text not null default '',
  tags text[] default '{}',
  visibility text not null default 'private',
  created_at timestamptz default now()
);

drop trigger if exists corpus_entries_set_updated_at on public.corpus_entries;
create trigger corpus_entries_set_updated_at
  before update on public.corpus_entries
  for each row execute function public.set_updated_at();

drop trigger if exists weekly_reviews_set_updated_at on public.weekly_reviews;
create trigger weekly_reviews_set_updated_at
  before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

-- ===== RLS =====
alter table public.app_admins enable row level security;
alter table public.corpus_entries enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.review_items enable row level security;
alter table public.daily_logs enable row level security;
alter table public.templates enable row level security;
alter table public.glossary enable row level security;
alter table public.grammar_points enable row level security;
alter table public.grammar_practice enable row level security;
alter table public.roleplay_scripts enable row level security;
alter table public.growth_log enable row level security;
alter table public.content_posts enable row level security;
alter table public.idea_bank enable row level security;
alter table public.leads enable row level security;
alter table public.user_settings enable row level security;
alter table public.site_texts enable row level security;
alter table public.jazz_timeline enable row level security;
alter table public.jazz_compare enable row level security;
alter table public.jazz_inspiration enable row level security;

create policy "Admins can read own admin row"
  on public.app_admins for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can manage own corpus entries"
  on public.corpus_entries for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own weekly reviews"
  on public.weekly_reviews for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own review items"
  on public.review_items for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own daily logs"
  on public.daily_logs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read builtin and own templates"
  on public.templates for select to authenticated
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own templates"
  on public.templates for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own templates"
  on public.templates for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own templates"
  on public.templates for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users can read builtin and own glossary"
  on public.glossary for select to authenticated
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own glossary"
  on public.glossary for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own glossary"
  on public.glossary for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own glossary"
  on public.glossary for delete to authenticated
  using (auth.uid() = user_id);

create policy "Anyone can read grammar points"
  on public.grammar_points for select to anon, authenticated
  using (true);

create policy "Users can manage own grammar practice"
  on public.grammar_practice for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read builtin and own roleplay scripts"
  on public.roleplay_scripts for select to authenticated
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own roleplay scripts"
  on public.roleplay_scripts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own roleplay scripts"
  on public.roleplay_scripts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own roleplay scripts"
  on public.roleplay_scripts for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users can manage own growth log"
  on public.growth_log for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own content posts"
  on public.content_posts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own idea bank"
  on public.idea_bank for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public can submit leads"
  on public.leads for insert to anon, authenticated
  with check (true);

create policy "Only app admins can read leads"
  on public.leads for select to authenticated
  using (exists (
    select 1 from public.app_admins
    where app_admins.user_id = auth.uid()
  ));

create policy "Users can manage own settings"
  on public.user_settings for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own site texts"
  on public.site_texts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own jazz timeline"
  on public.jazz_timeline for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own jazz compare"
  on public.jazz_compare for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own jazz inspiration"
  on public.jazz_inspiration for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
