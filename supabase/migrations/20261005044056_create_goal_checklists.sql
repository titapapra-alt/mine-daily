-- Personal checklist targets for a day, week, month, or year.
create table public.goal_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('day', 'week', 'month', 'year')),
  period_start date not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_checklists_period_start_check check (
    target_type = 'day'
    or (target_type = 'week' and extract(isodow from period_start) = 1)
    or (target_type = 'month' and extract(day from period_start) = 1)
    or (target_type = 'year' and extract(month from period_start) = 1 and extract(day from period_start) = 1)
  )
);

create index goal_checklists_owner_period_idx
on public.goal_checklists (user_id, target_type, period_start desc);

create trigger goal_checklists_set_updated_at before update on public.goal_checklists
for each row execute function public.set_updated_at();

alter table public.goal_checklists enable row level security;
revoke all on table public.goal_checklists from anon, authenticated;
grant select, insert, update, delete on table public.goal_checklists to authenticated;

create policy "goal_checklists_owner_select" on public.goal_checklists for select to authenticated
using ((select auth.uid()) = user_id);

create policy "goal_checklists_owner_insert" on public.goal_checklists for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "goal_checklists_owner_update" on public.goal_checklists for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "goal_checklists_owner_delete" on public.goal_checklists for delete to authenticated
using ((select auth.uid()) = user_id);
