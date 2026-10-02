import { isLocalPreview } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { CalorieFavorite } from "@/types/calorie-favorite";

type RawCalorieFavorite = {
  id: string;
  calories: number;
  detail: string;
};

export const mapCalorieFavorite = (favorite: RawCalorieFavorite): CalorieFavorite => ({
  id: favorite.id,
  calories: favorite.calories,
  detail: favorite.detail,
});

export async function getCalorieFavorites() {
  if (isLocalPreview) return [];
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("calorie_favorites")
    .select("id, calories, detail")
    .eq("user_id", userId)
    .order("detail")
    .order("calories");
  if (error) throw error;
  return (data ?? []).map((favorite) => mapCalorieFavorite(favorite as RawCalorieFavorite));
}
