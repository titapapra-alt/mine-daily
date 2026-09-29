alter table public.diary_entries
drop constraint if exists diary_entries_mood_check;

update public.diary_entries
set mood = case mood
  when 'sunny' then 'happy'
  when 'thoughtful' then 'calm'
  when 'rainy' then 'sad'
  else mood
end
where mood in ('sunny', 'thoughtful', 'rainy');

alter table public.diary_entries
add constraint diary_entries_mood_check
check (mood is null or mood in (
  'happy',
  'excited',
  'calm',
  'sad',
  'anxious',
  'bored',
  'tired',
  'meh'
));
