alter table public.daily_records
  add column if not exists seed_cycling text;

alter table public.daily_records
  drop constraint if exists daily_records_seed_cycling_check;

alter table public.daily_records
  add constraint daily_records_seed_cycling_check
  check (seed_cycling is null or seed_cycling in ('phase_1', 'phase_2'));
