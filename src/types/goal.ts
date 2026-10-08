export type GoalTargetType = "day" | "week" | "month" | "year";

export type GoalChecklist = {
  id: string;
  target_type: GoalTargetType;
  period_start: string;
  title: string;
  description: string;
  is_complete: boolean;
};

export type GoalChecklistInput = Omit<GoalChecklist, "id">;
