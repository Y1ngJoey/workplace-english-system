-- 旅行美食扩建 · run in Supabase SQL Editor
-- Creates trips / places / place_media, RLS, travel photo bucket, and a Kyoto demo trip.

create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  country text,
  country_flag text,
  date_start date,
  date_end date,
  intro text,
  cover_emoji text,
  cover_url text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_label text not null default '',
  date_label text not null default '',
  type text not null default '',
  type_color text not null default 'see' check (type_color in ('stay', 'food', 'see', 'shop')),
  name text not null default '',
  address text,
  mood text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.place_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  url text not null,
  platform text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create index if not exists trips_user_sort_idx
  on public.trips (user_id, sort_order, date_start desc);

create index if not exists places_trip_sort_idx
  on public.places (trip_id, sort_order);

create index if not exists place_media_place_sort_idx
  on public.place_media (place_id, sort_order);

alter table public.trips enable row level security;
alter table public.places enable row level security;
alter table public.place_media enable row level security;

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.places to authenticated;
grant select, insert, update, delete on public.place_media to authenticated;

drop policy if exists "Users can manage own travel trips" on public.trips;
create policy "Users can manage own travel trips"
  on public.trips for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own travel places" on public.places;
create policy "Users can manage own travel places"
  on public.places for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own travel media" on public.place_media;
create policy "Users can manage own travel media"
  on public.place_media for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('travel-photos', 'travel-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read travel photos" on storage.objects;
create policy "Anyone can read travel photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'travel-photos');

drop policy if exists "Users can upload own travel photos" on storage.objects;
create policy "Users can upload own travel photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own travel photos" on storage.objects;
create policy "Users can update own travel photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own travel photos" on storage.objects;
create policy "Users can delete own travel photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'travel-photos' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
declare
  owner_id uuid;
  kyoto_trip_id uuid;
  kanra_id uuid;
  nishiki_id uuid;
  fushimi_id uuid;
  ippodo_id uuid;
  washi_id uuid;
  arashiyama_id uuid;
begin
  select id into owner_id
  from auth.users
  order by created_at asc
  limit 1;

  if owner_id is null then
    raise notice 'No auth user exists yet. Sign up once, then rerun this seed block.';
    return;
  end if;

  select id into kyoto_trip_id
  from public.trips
  where user_id = owner_id and title = '京都 · 2025 秋'
  limit 1;

  if kyoto_trip_id is null then
    insert into public.trips (
      user_id, title, country, country_flag, date_start, date_end, intro, cover_emoji, sort_order
    )
    values (
      owner_id,
      '京都 · 2025 秋',
      '日本',
      '🇯🇵',
      '2025-10-18',
      '2025-10-22',
      '一条时间线从中间一路往下，左右交替记下每一天去了哪。',
      '⛩️',
      0
    )
    returning id into kyoto_trip_id;
  end if;

  insert into public.places (user_id, trip_id, day_label, date_label, type, type_color, name, address, mood, visibility, sort_order)
  select owner_id, kyoto_trip_id, 'Day 1', '10.18', '住宿', 'stay', 'Hotel Kanra Kyoto', '📍 京都市下京区', '夜里风铃叮当，像把整座城市关在门外，睡得格外安稳。', 'private', 0
  where not exists (select 1 from public.places where trip_id = kyoto_trip_id and name = 'Hotel Kanra Kyoto')
  returning id into kanra_id;
  if kanra_id is null then select id into kanra_id from public.places where trip_id = kyoto_trip_id and name = 'Hotel Kanra Kyoto' limit 1; end if;

  insert into public.places (user_id, trip_id, day_label, date_label, type, type_color, name, address, mood, visibility, sort_order)
  select owner_id, kyoto_trip_id, 'Day 2', '10.19', '美食', 'food', '錦市場 · 玉子烧', '📍 京都市中京区錦小路', '排了四十分钟，咬下那口热乎乎的甜，瞬间觉得值了。', 'public', 1
  where not exists (select 1 from public.places where trip_id = kyoto_trip_id and name = '錦市場 · 玉子烧')
  returning id into nishiki_id;
  if nishiki_id is null then select id into nishiki_id from public.places where trip_id = kyoto_trip_id and name = '錦市場 · 玉子烧' limit 1; end if;

  insert into public.places (user_id, trip_id, day_label, date_label, type, type_color, name, address, mood, visibility, sort_order)
  select owner_id, kyoto_trip_id, 'Day 2', '10.19', '打卡地', 'see', '伏見稲荷大社', '📍 京都市伏见区', '清晨六点的千本鸟居几乎没人，红色一路向上，安静得想哭。', 'public', 2
  where not exists (select 1 from public.places where trip_id = kyoto_trip_id and name = '伏見稲荷大社')
  returning id into fushimi_id;
  if fushimi_id is null then select id into fushimi_id from public.places where trip_id = kyoto_trip_id and name = '伏見稲荷大社' limit 1; end if;

  insert into public.places (user_id, trip_id, day_label, date_label, type, type_color, name, address, mood, visibility, sort_order)
  select owner_id, kyoto_trip_id, 'Day 3', '10.20', '茶屋', 'food', '一保堂茶舗', '📍 京都市中京区', '抹茶配一颗和果子，在榻榻米上坐了一下午，什么都不想。', 'private', 3
  where not exists (select 1 from public.places where trip_id = kyoto_trip_id and name = '一保堂茶舗')
  returning id into ippodo_id;
  if ippodo_id is null then select id into ippodo_id from public.places where trip_id = kyoto_trip_id and name = '一保堂茶舗' limit 1; end if;

  insert into public.places (user_id, trip_id, day_label, date_label, type, type_color, name, address, mood, visibility, sort_order)
  select owner_id, kyoto_trip_id, 'Day 4', '10.21', '购物', 'shop', '一家和纸小店', '📍 京都市东山区', '挑和纸挑到忘记时间，老板娘笑着多送了我两张，超暖。', 'private', 4
  where not exists (select 1 from public.places where trip_id = kyoto_trip_id and name = '一家和纸小店')
  returning id into washi_id;
  if washi_id is null then select id into washi_id from public.places where trip_id = kyoto_trip_id and name = '一家和纸小店' limit 1; end if;

  insert into public.places (user_id, trip_id, day_label, date_label, type, type_color, name, address, mood, visibility, sort_order)
  select owner_id, kyoto_trip_id, 'Day 5', '10.22', '景点', 'see', '嵐山 · 竹林の道', '📍 京都市右京区', '穿过竹林那一段，风从头顶簌簌掠过，像被整座山轻轻抱住。', 'public', 5
  where not exists (select 1 from public.places where trip_id = kyoto_trip_id and name = '嵐山 · 竹林の道')
  returning id into arashiyama_id;
  if arashiyama_id is null then select id into arashiyama_id from public.places where trip_id = kyoto_trip_id and name = '嵐山 · 竹林の道' limit 1; end if;

  insert into public.place_media (user_id, place_id, kind, url, platform, sort_order)
  select owner_id, place_id, kind, url, platform, sort_order
  from (
    values
      (kanra_id, 'photo', 'emoji:🏯', null, 0),
      (kanra_id, 'photo', 'emoji:🛏️', null, 1),
      (kanra_id, 'photo', 'emoji:🌿', null, 2),
      (nishiki_id, 'photo', 'emoji:🍳', null, 0),
      (nishiki_id, 'photo', 'emoji:🥢', null, 1),
      (nishiki_id, 'video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 'YouTube', 2),
      (fushimi_id, 'photo', 'emoji:⛩️', null, 0),
      (fushimi_id, 'photo', 'emoji:🦊', null, 1),
      (fushimi_id, 'video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 'YouTube', 2),
      (ippodo_id, 'photo', 'emoji:🍵', null, 0),
      (washi_id, 'photo', 'emoji:🧧', null, 0),
      (washi_id, 'photo', 'emoji:✒️', null, 1),
      (arashiyama_id, 'video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 'YouTube', 0)
  ) as seed(place_id, kind, url, platform, sort_order)
  where place_id is not null
    and not exists (
      select 1 from public.place_media
      where place_media.place_id = seed.place_id
        and place_media.url = seed.url
    );
end $$;

select pg_notify('pgrst', 'reload schema');
