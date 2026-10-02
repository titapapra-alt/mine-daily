export type CalorieTone = "excellent" | "careful" | "over" | "dangerous" | "extremely-dangerous";

export type CalorieStatus = {
  label: "Excellent" | "Be Careful" | "Over" | "Dangerous" | "Extremely Dangerous";
  tone: CalorieTone;
};

export const calorieStatus = (total: number): CalorieStatus => total < 1800
  ? { label: "Excellent", tone: "excellent" }
  : total < 2000
    ? { label: "Be Careful", tone: "careful" }
    : total < 2400
      ? { label: "Over", tone: "over" }
      : total < 2800
        ? { label: "Dangerous", tone: "dangerous" }
        : { label: "Extremely Dangerous", tone: "extremely-dangerous" };
