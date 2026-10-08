"use server";

import { revalidatePath } from "next/cache";
import { mapGoalChecklist } from "@/lib/goals";
import { assertLocalWritable } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { GoalChecklistInput, GoalTargetType } from "@/types/goal";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const targetTypes: GoalTargetType[] = ["day", "week", "month", "year"];
const selectFields = "id, target_type, period_start, title, description, is_complete";

const validatePeriod = (type: GoalTargetType, value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (!datePattern.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Please choose a valid target period.");
  if (type === "week" && date.getUTCDay() !== 1) throw new Error("Weekly targets must begin on Monday.");
  if (type === "month" && date.getUTCDate() !== 1) throw new Error("Monthly targets must begin on the first day of the month.");
  if (type === "year" && (date.getUTCMonth() !== 0 || date.getUTCDate() !== 1)) throw new Error("Yearly targets must begin on January 1.");
  return value;
};

const validateGoal = (goal: GoalChecklistInput) => {
  if (!targetTypes.includes(goal.target_type)) throw new Error("Invalid target type.");
  const title = goal.title.trim();
  const description = goal.description.trim();
  if (!title || title.length > 160) throw new Error("Target is required and must not exceed 160 characters.");
  if (description.length > 1000) throw new Error("Description must not exceed 1,000 characters.");
  return { target_type: goal.target_type, period_start: validatePeriod(goal.target_type, goal.period_start), title, description, is_complete: Boolean(goal.is_complete) };
};

const validateId = (id: string) => { if (!uuidPattern.test(id)) throw new Error("Invalid goal ID."); };
const refreshGoals = () => revalidatePath("/goals");

export async function createGoalAction(goal: GoalChecklistInput) {
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("goal_checklists").insert({ ...validateGoal(goal), user_id: userId }).select(selectFields).single();
  if (error) throw error;
  refreshGoals();
  return mapGoalChecklist(data);
}

export async function updateGoalAction(id: string, goal: GoalChecklistInput) {
  assertLocalWritable();
  validateId(id);
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("goal_checklists").update(validateGoal(goal)).eq("id", id).eq("user_id", userId).select(selectFields).single();
  if (error) throw error;
  refreshGoals();
  return mapGoalChecklist(data);
}

export async function toggleGoalAction(id: string, isComplete: boolean) {
  assertLocalWritable();
  validateId(id);
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("goal_checklists").update({ is_complete: Boolean(isComplete) }).eq("id", id).eq("user_id", userId).select(selectFields).single();
  if (error) throw error;
  refreshGoals();
  return mapGoalChecklist(data);
}

export async function deleteGoalAction(id: string) {
  assertLocalWritable();
  validateId(id);
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("goal_checklists").delete().eq("id", id).eq("user_id", userId).select("id").single();
  if (error) throw error;
  refreshGoals();
  return data.id as string;
}
