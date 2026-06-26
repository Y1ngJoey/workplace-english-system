-- 个人主场扩建 · run once in Supabase SQL Editor

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

alter table public.site_texts enable row level security;
alter table public.jazz_timeline enable row level security;
alter table public.jazz_compare enable row level security;
alter table public.jazz_inspiration enable row level security;

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.site_texts to authenticated;
grant select, insert, update, delete on public.jazz_timeline to authenticated;
grant select, insert, update, delete on public.jazz_compare to authenticated;
grant select, insert, update, delete on public.jazz_inspiration to authenticated;

drop policy if exists "Users can manage own site texts" on public.site_texts;
create policy "Users can manage own site texts"
  on public.site_texts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own jazz timeline" on public.jazz_timeline;
create policy "Users can manage own jazz timeline"
  on public.jazz_timeline for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own jazz compare" on public.jazz_compare;
create policy "Users can manage own jazz compare"
  on public.jazz_compare for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own jazz inspiration" on public.jazz_inspiration;
create policy "Users can manage own jazz inspiration"
  on public.jazz_inspiration for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

select pg_notify('pgrst', 'reload schema');
