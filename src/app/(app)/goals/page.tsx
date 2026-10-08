import { GoalsChecklist } from "@/components/goals-checklist";
import { getGoalChecklists } from "@/lib/goals";
import { isLocalPreview, isLocalReadOnly } from "@/lib/supabase/config";

export default async function GoalsPage() {
  const goals = await getGoalChecklists();
  return <GoalsChecklist initialGoals={goals} localPreview={isLocalPreview} readOnly={isLocalReadOnly} />;
}
