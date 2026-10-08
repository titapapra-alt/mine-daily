import { isLocalPreview } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { GoalChecklist } from "@/types/goal";

type RawGoalChecklist = GoalChecklist;

export const mapGoalChecklist = (row: RawGoalChecklist): GoalChecklist => ({
  id: row.id,
  target_type: row.target_type,
  period_start: row.period_start,
  title: row.title,
  description: row.description ?? "",
  is_complete: row.is_complete,
});

export async function getGoalChecklists() {
  if (isLocalPreview) return [];
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("goal_checklists")
    .select("id, target_type, period_start, title, description, is_complete")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapGoalChecklist(row as RawGoalChecklist));
}
