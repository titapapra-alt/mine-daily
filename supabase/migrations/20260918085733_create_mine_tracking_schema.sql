-- Daily tracking data used by Mine's dashboard, calendar, and insights views.
create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  sleep_hours numeric(4,2) check (sleep_hours >= 0 and sleep_hours <= 24),
  weight_kg numeric(5,2) check (weight_kg > 0 and weight_kg < 500),
  if_hour text check (if_hour is null or if_hour ~ '^\d{1,2}/\d{1,2}$'),
  water boolean not null default false,
  poo boolean not null default false,
  period boolean not null default false,
  note text check (note is null or char_length(note) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.daily_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  meal_time time,
  calories integer not null check (calories >= 0 and calories <= 20000),
  detail text not null check (char_length(detail) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_record_id uuid not null references public.daily_records(id) on delete cascade,
  exercise_type text not null check (char_length(exercise_type) <= 120),
  exercise_part text check (exercise_part is null or char_length(exercise_part) <= 160),
  exercise_note text check (exercise_note is null or char_length(exercise_note) <= 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  event_time time,
  detail text not null check (char_length(detail) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_records_owner_date_idx on public.daily_records (user_id, entry_date desc);
create index if not exists daily_meals_owner_record_time_idx on public.daily_meals (user_id, daily_record_id, meal_time);
create index if not exists daily_exercises_owner_record_idx on public.daily_exercises (user_id, daily_record_id);
create index if not exists calendar_events_owner_date_time_idx on public.calendar_events (user_id, event_date, event_time);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daily_records_set_updated_at before update on public.daily_records
for each row execute function public.set_updated_at();

create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.daily_records enable row level security;
alter table public.daily_meals enable row level security;
alter table public.daily_exercises enable row level security;
alter table public.calendar_events enable row level security;

revoke all on table public.daily_records, public.daily_meals, public.daily_exercises, public.calendar_events from anon, authenticated;
grant select, insert, update, delete on table public.daily_records, public.daily_meals, public.daily_exercises, public.calendar_events to authenticated;

create policy "daily_records_owner_select" on public.daily_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "daily_records_owner_insert" on public.daily_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daily_records_owner_update" on public.daily_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daily_records_owner_delete" on public.daily_records for delete to authenticated using ((select auth.uid()) = user_id);

create policy "daily_meals_owner_select" on public.daily_meals for select to authenticated using ((select auth.uid()) = user_id);
create policy "daily_meals_owner_insert" on public.daily_meals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daily_meals_owner_update" on public.daily_meals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daily_meals_owner_delete" on public.daily_meals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "daily_exercises_owner_select" on public.daily_exercises for select to authenticated using ((select auth.uid()) = user_id);
create policy "daily_exercises_owner_insert" on public.daily_exercises for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "daily_exercises_owner_update" on public.daily_exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "daily_exercises_owner_delete" on public.daily_exercises for delete to authenticated using ((select auth.uid()) = user_id);

create policy "calendar_events_owner_select" on public.calendar_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "calendar_events_owner_insert" on public.calendar_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "calendar_events_owner_update" on public.calendar_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "calendar_events_owner_delete" on public.calendar_events for delete to authenticated using ((select auth.uid()) = user_id);
