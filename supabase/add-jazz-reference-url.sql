-- Run once in Supabase SQL Editor before using the curve timeline's teaching-video field.

alter table public.jazz_timeline
  add column if not exists reference_url text;
