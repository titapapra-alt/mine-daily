alter table public.daily_records
add column if not exists caffeine boolean not null default false;
