import type { Locale } from "@/lib/locale";

export type Gender = "female" | "male" | "other";
export type ActivityLevel = "low" | "moderate" | "high";
export type GoalDirection = "lose" | "gain" | "maintain";
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export type HealthMetricsInput = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
};

export type ProjectionPoint = {
  week: number;
  weightKg: number;
};

export type HealthMetrics = {
  bmi: number;
  bmiCategory: BmiCategory;
  bmr: number;
  tdee: number;
  goalDirection: GoalDirection;
  recommendedCalories: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  weeklyRateKg: number;
  weeksToGoal: number;
  targetDateIso: string | null;
  projection: ProjectionPoint[];
};

// Kilocalories stored in ~1 kg of body mass. Used for time-to-goal estimation.
const KCAL_PER_KG = 7700;
const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  low: 1.2,
  moderate: 1.45,
  high: 1.7
};
// Safety floors so a deficit recommendation never drops below a sane intake.
const CALORIE_FLOOR: Record<Gender, number> = {
  female: 1200,
  male: 1500,
  other: 1300
};
const MAX_PROJECTION_WEEKS = 104;

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

/**
 * Deterministic health-assessment algorithm.
 *
 * - BMI: weight / height^2 (metric)
 * - BMR: Mifflin-St Jeor (gender aware)
 * - TDEE: BMR * activity factor
 * - Recommended intake: TDEE adjusted for goal direction, floored for safety
 * - Target date: |weight - target| / safe weekly rate, from the actual
 *   energy balance implied by the recommendation (kcal/kg model)
 *
 * The function is pure and side-effect free so it can be unit tested against
 * boundary, extreme, and illegal inputs.
 */
export function computeHealthMetrics(input: HealthMetricsInput, now: Date = new Date()): HealthMetrics {
  const { gender, age, heightCm, weightKg, targetWeightKg, activityLevel } = input;

  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error("heightCm must be a positive, finite number");
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("weightKg must be a positive, finite number");
  }
  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0) {
    throw new Error("targetWeightKg must be a positive, finite number");
  }
  if (!Number.isFinite(age) || age <= 0) {
    throw new Error("age must be a positive, finite number");
  }

  const heightM = heightCm / 100;
  const bmi = round(weightKg / (heightM * heightM), 1);
  const bmiCategory = categorizeBmi(bmi);

  const genderOffset = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const bmr = round(10 * weightKg + 6.25 * heightCm - 5 * age + genderOffset);
  const tdee = round(bmr * (ACTIVITY_FACTORS[activityLevel] ?? ACTIVITY_FACTORS.moderate));

  const delta = weightKg - targetWeightKg;
  const goalDirection: GoalDirection = delta > 0.5 ? "lose" : delta < -0.5 ? "gain" : "maintain";

  let recommendedCalories = tdee;
  if (goalDirection === "lose") {
    recommendedCalories = Math.max(tdee - 500, CALORIE_FLOOR[gender] ?? CALORIE_FLOOR.other);
  } else if (goalDirection === "gain") {
    recommendedCalories = tdee + 300;
  }
  recommendedCalories = round(recommendedCalories);

  const proteinG = round(1.6 * weightKg);
  const fatCals = recommendedCalories * 0.25;
  const fatG = round(fatCals / 9);
  const carbsCals = Math.max(0, recommendedCalories - fatCals - proteinG * 4);
  const carbsG = round(carbsCals / 4);

  const dailyEnergyGap = Math.abs(tdee - recommendedCalories);
  const weeklyRateKg = goalDirection === "maintain" ? 0 : round((dailyEnergyGap * 7) / KCAL_PER_KG, 2);

  let weeksToGoal = 0;
  let targetDateIso: string | null = null;
  if (goalDirection !== "maintain" && weeklyRateKg > 0) {
    weeksToGoal = Math.min(MAX_PROJECTION_WEEKS, Math.ceil(Math.abs(delta) / weeklyRateKg));
    const targetDate = new Date(now.getTime() + weeksToGoal * 7 * 24 * 60 * 60 * 1000);
    targetDateIso = targetDate.toISOString().slice(0, 10);
  }

  const projection = buildProjection(weightKg, targetWeightKg, weeksToGoal);

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    goalDirection,
    recommendedCalories,
    macros: { proteinG, carbsG, fatG },
    weeklyRateKg,
    weeksToGoal,
    targetDateIso,
    projection
  };
}

function buildProjection(startKg: number, targetKg: number, weeksToGoal: number): ProjectionPoint[] {
  if (weeksToGoal <= 0) {
    return [{ week: 0, weightKg: round(startKg, 1) }];
  }
  const sampleCount = Math.min(weeksToGoal, 12);
  const points: ProjectionPoint[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const ratio = i / sampleCount;
    const week = Math.round(ratio * weeksToGoal);
    const weightKg = round(startKg + (targetKg - startKg) * ratio, 1);
    points.push({ week, weightKg });
  }
  return points;
}

export function describeBmiCategory(category: BmiCategory, locale: Locale): string {
  const zh: Record<BmiCategory, string> = {
    underweight: "偏瘦",
    normal: "正常",
    overweight: "偏重",
    obese: "肥胖"
  };
  const en: Record<BmiCategory, string> = {
    underweight: "Underweight",
    normal: "Normal",
    overweight: "Overweight",
    obese: "Obese"
  };
  return locale === "zh" ? zh[category] : en[category];
}
