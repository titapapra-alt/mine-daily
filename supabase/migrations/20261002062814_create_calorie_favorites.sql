-- Reusable calorie entries for quickly filling the Add calories form.
create table public.calorie_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  calories integer not null check (calories >= 0 and calories <= 20000),
  detail text not null check (char_length(trim(detail)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, calories, detail)
);

create index calorie_favorites_owner_detail_idx on public.calorie_favorites (user_id, detail);

create trigger calorie_favorites_set_updated_at before update on public.calorie_favorites
for each row execute function public.set_updated_at();

alter table public.calorie_favorites enable row level security;
revoke all on table public.calorie_favorites from anon, authenticated;
grant select, insert, update, delete on table public.calorie_favorites to authenticated;

create policy "calorie_favorites_owner_select" on public.calorie_favorites for select to authenticated
using ((select auth.uid()) = user_id);

create policy "calorie_favorites_owner_insert" on public.calorie_favorites for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "calorie_favorites_owner_update" on public.calorie_favorites for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "calorie_favorites_owner_delete" on public.calorie_favorites for delete to authenticated
using ((select auth.uid()) = user_id);
