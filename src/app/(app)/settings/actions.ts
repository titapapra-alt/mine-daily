"use server";

import { revalidatePath } from "next/cache";
import { mapCalorieFavorite } from "@/lib/calorie-favorites";
import { assertLocalWritable } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { CalorieFavoriteInput } from "@/types/calorie-favorite";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const selectFields = "id, calories, detail";

const validateFavorite = (favorite: CalorieFavoriteInput) => {
  const calories = Number(favorite.calories);
  const detail = favorite.detail.trim();
  if (!Number.isInteger(calories) || calories < 0 || calories > 20000) throw new Error("Calories must be a whole number between 0 and 20,000.");
  if (!detail || detail.length > 3000) throw new Error("More detail is required and must not exceed 3,000 characters.");
  return { calories, detail };
};

const refreshFavorites = () => {
  revalidatePath("/");
  revalidatePath("/settings");
};

export async function createCalorieFavoriteAction(favorite: CalorieFavoriteInput) {
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("calorie_favorites").insert({ ...validateFavorite(favorite), user_id: userId }).select(selectFields).single();
  if (error) throw error;
  refreshFavorites();
  return mapCalorieFavorite(data);
}

export async function updateCalorieFavoriteAction(id: string, favorite: CalorieFavoriteInput) {
  assertLocalWritable();
  if (!uuidPattern.test(id)) throw new Error("Invalid favorite ID.");
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("calorie_favorites").update(validateFavorite(favorite)).eq("id", id).eq("user_id", userId).select(selectFields).single();
  if (error) throw error;
  refreshFavorites();
  return mapCalorieFavorite(data);
}

export async function deleteCalorieFavoriteAction(id: string) {
  assertLocalWritable();
  if (!uuidPattern.test(id)) throw new Error("Invalid favorite ID.");
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("calorie_favorites").delete().eq("id", id).eq("user_id", userId).select("id").single();
  if (error) throw error;
  refreshFavorites();
  return data.id as string;
}
