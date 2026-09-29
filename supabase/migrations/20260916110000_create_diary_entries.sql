-- Evergreen diary: private entries owned by the authenticated writer.
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) > 0),
  mood text check (mood in ('sunny', 'calm', 'thoughtful', 'tired', 'rainy')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diary_entries_owner_date_idx on public.diary_entries (user_id, entry_date desc);
create index if not exists diary_entries_tags_idx on public.diary_entries using gin (tags);

create or replace function public.set_diary_entry_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diary_entries_set_updated_at on public.diary_entries;
create trigger diary_entries_set_updated_at
before update on public.diary_entries
for each row execute function public.set_diary_entry_updated_at();

alter table public.diary_entries enable row level security;
revoke all on table public.diary_entries from anon, authenticated;
grant select, insert, update, delete on table public.diary_entries to authenticated;

create policy "Diary owners can read their entries"
on public.diary_entries for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Diary owners can create their entries"
on public.diary_entries for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Diary owners can update their entries"
on public.diary_entries for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Diary owners can delete their entries"
on public.diary_entries for delete to authenticated
using ((select auth.uid()) = user_id);
