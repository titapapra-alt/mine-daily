import { createClient } from "@/lib/supabase/client";
import { assertLocalWritable } from "@/lib/supabase/config";

export type Meal = { id: string; time: string; calories: string; detail: string };
export type Exercise = { id: string; type: string; part: string; note: string };
export type SeedCyclingPhase = "" | "phase_1" | "phase_2";
export type DayData = { id?: string; date: string; sleep: string; weight: string; ifHour: string; seedCycling: SeedCyclingPhase; water: boolean; poo: boolean; caffeine: boolean; period: boolean; note: string; meals: Meal[]; exercises: Exercise[] };

type RawMeal = { id: string; meal_time: string | null; calories: number; detail: string };
type RawExercise = { id: string; exercise_type: string; exercise_part: string | null; exercise_note: string | null };
type RawDay = { id: string; entry_date: string; sleep_hours: number | null; weight_kg: number | null; if_hour: string | null; seed_cycling: Exclude<SeedCyclingPhase, ""> | null; water: boolean; poo: boolean; caffeine: boolean; period: boolean; note: string | null; daily_meals?: RawMeal[]; daily_exercises?: RawExercise[] };

const blankDay = (date: string): DayData => ({ date, sleep: "", weight: "", ifHour: "", seedCycling: "", water: false, poo: false, caffeine: false, period: false, note: "", meals: [], exercises: [] });
const mapDay = (value: RawDay): DayData => ({ id: value.id, date: value.entry_date, sleep: value.sleep_hours?.toFixed(2) ?? "", weight: value.weight_kg?.toFixed(2) ?? "", ifHour: value.if_hour ?? "", seedCycling: value.seed_cycling ?? "", water: value.water, poo: value.poo, caffeine: value.caffeine, period: value.period, note: value.note ?? "", meals: (value.daily_meals ?? []).sort((a, b) => (a.meal_time ?? "").localeCompare(b.meal_time ?? "")).map((meal) => ({ id: meal.id, time: meal.meal_time?.slice(0, 5) ?? "", calories: String(meal.calories), detail: meal.detail })), exercises: (value.daily_exercises ?? []).map((exercise) => ({ id: exercise.id, type: exercise.exercise_type, part: exercise.exercise_part ?? "", note: exercise.exercise_note ?? "" })) });

const getOwnerId = async () => {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again to view your data.");
  return { client, userId: data.user.id };
};

export async function getDailyRecord(date: string) {
  const { client } = await getOwnerId();
  const { data, error } = await client.from("daily_records").select("id, entry_date, sleep_hours, weight_kg, if_hour, seed_cycling, water, poo, caffeine, period, note, daily_meals(id, meal_time, calories, detail), daily_exercises(id, exercise_type, exercise_part, exercise_note)").eq("entry_date", date).maybeSingle();
  if (error) throw error;
  return data ? mapDay(data as RawDay) : blankDay(date);
}

export async function getDailyRecords() {
  const { client } = await getOwnerId();
  const { data, error } = await client.from("daily_records").select("id, entry_date, sleep_hours, weight_kg, if_hour, seed_cycling, water, poo, caffeine, period, note, daily_meals(id, meal_time, calories, detail), daily_exercises(id, exercise_type, exercise_part, exercise_note)").order("entry_date");
  if (error) throw error;
  return (data ?? []).map((record) => mapDay(record as RawDay));
}

export async function saveDailyRecord(day: DayData) {
  assertLocalWritable();
  const { client, userId } = await getOwnerId();
  const { data, error } = await client.from("daily_records").upsert({ user_id: userId, entry_date: day.date, sleep_hours: day.sleep ? Number(day.sleep) : null, weight_kg: day.weight ? Number(day.weight) : null, if_hour: day.ifHour || null, seed_cycling: day.seedCycling || null, water: day.water, poo: day.poo, caffeine: day.caffeine, period: day.period, note: day.note.trim() || null }, { onConflict: "user_id,entry_date" }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function createMeal(day: DayData, meal: Omit<Meal, "id">) {
  assertLocalWritable();
  const [recordId, { client, userId }] = await Promise.all([saveDailyRecord(day), getOwnerId()]);
  const { data, error } = await client.from("daily_meals").insert({ user_id: userId, daily_record_id: recordId, meal_time: meal.time || null, calories: Number(meal.calories), detail: meal.detail.trim() }).select("id, meal_time, calories, detail").single();
  if (error) throw error;
  const value = data as RawMeal;
  return { id: value.id, time: value.meal_time?.slice(0, 5) ?? "", calories: String(value.calories), detail: value.detail };
}

export async function updateMeal(id: string, meal: Omit<Meal, "id">) {
  assertLocalWritable();
  const { client, userId } = await getOwnerId();
  const { data, error } = await client.from("daily_meals").update({ meal_time: meal.time || null, calories: Number(meal.calories), detail: meal.detail.trim() }).eq("id", id).eq("user_id", userId).select("id, meal_time, calories, detail").single();
  if (error) throw error;
  const value = data as RawMeal;
  return { id: value.id, time: value.meal_time?.slice(0, 5) ?? "", calories: String(value.calories), detail: value.detail };
}

export async function deleteMeal(id: string) {
  assertLocalWritable();
  const { client, userId } = await getOwnerId();
  const { error } = await client.from("daily_meals").delete().eq("id", id).eq("user_id", userId).select("id").single();
  if (error) throw error;
}

export async function createExercise(day: DayData, exercise: Omit<Exercise, "id">) {
  assertLocalWritable();
  const [recordId, { client, userId }] = await Promise.all([saveDailyRecord(day), getOwnerId()]);
  const { data, error } = await client.from("daily_exercises").insert({ user_id: userId, daily_record_id: recordId, exercise_type: exercise.type, exercise_part: exercise.part || null, exercise_note: exercise.note.trim() || null }).select("id, exercise_type, exercise_part, exercise_note").single();
  if (error) throw error;
  const value = data as RawExercise;
  return { id: value.id, type: value.exercise_type, part: value.exercise_part ?? "", note: value.exercise_note ?? "" };
}

export async function updateExercise(id: string, exercise: Omit<Exercise, "id">) {
  assertLocalWritable();
  const { client, userId } = await getOwnerId();
  const { data, error } = await client.from("daily_exercises").update({ exercise_type: exercise.type, exercise_part: exercise.part || null, exercise_note: exercise.note.trim() || null }).eq("id", id).eq("user_id", userId).select("id, exercise_type, exercise_part, exercise_note").single();
  if (error) throw error;
  const value = data as RawExercise;
  return { id: value.id, type: value.exercise_type, part: value.exercise_part ?? "", note: value.exercise_note ?? "" };
}

export async function deleteExercise(id: string) {
  assertLocalWritable();
  const { client, userId } = await getOwnerId();
  const { error } = await client.from("daily_exercises").delete().eq("id", id).eq("user_id", userId).select("id").single();
  if (error) throw error;
}
