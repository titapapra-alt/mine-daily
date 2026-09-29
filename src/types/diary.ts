export const moods = ["happy", "excited", "calm", "sad", "anxious", "bored", "tired", "meh"] as const;
export type Mood = (typeof moods)[number];
export type DiaryEntry = { id: string; user_id: string; entry_date: string; title: string; content: string; mood: Mood | null; tags: string[]; created_at: string; updated_at: string };
