import type { AnswerValue, RiskFlag, ScoredProfile } from "@/lib/contracts";

type AnswerMap = Record<string, AnswerValue>;

const asString = (value: AnswerValue | undefined, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: AnswerValue | undefined, fallback: number) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return fallback;
};

const asStringArray = (value: AnswerValue | undefined) =>
  Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

export function scoreAssessment(answers: AnswerMap): ScoredProfile {
  const activityLevel = asString(answers.activity_level, "low") as "low" | "moderate" | "high";
  const weeklySessions = asNumber(answers.weekly_sessions, 3);
  const preferredSessionMinutes = asNumber(answers.session_minutes, 18);
  const constraints = asStringArray(answers.limitations).filter((item) => item !== "none");
  const equipment = asStringArray(answers.equipment).filter((item) => item !== "none");
  const goalFeeling = asString(answers.goal_feeling, "energy");
  const primaryGoal = asString(answers.primary_goal, "habit");
  const motivationStyle = asString(answers.motivation_style, "coach");

  const intensityBase = activityLevel === "high" ? 78 : activityLevel === "moderate" ? 62 : 42;
  const recoveryNeed = Math.min(95, 35 + constraints.length * 14 + (preferredSessionMinutes > 25 ? 8 : 0));
  const consistency = Math.min(96, 48 + weeklySessions * 7 + (preferredSessionMinutes <= 18 ? 12 : 0));
  const readiness = Math.round((intensityBase + consistency + (100 - recoveryNeed)) / 3);

  const riskFlags: RiskFlag[] = constraints.map((constraint) => ({
    code: `care_${constraint}`,
    severity: "caution" as const,
    message: `Plan should include ${constraint.replace("_", " ")} modifications and avoid pain-provoking progressions.`
  }));

  if (constraints.length >= 3) {
    riskFlags.push({
      code: "multi_area_care",
      severity: "stop",
      message: "Multiple limitation areas require conservative programming and a medical professional if pain is present."
    });
  }

  const weeklyMinutes = weeklySessions * preferredSessionMinutes;
  const maxImpact = constraints.length > 0 || activityLevel === "low" ? "low" : "moderate";
  const focusAreas = [
    primaryGoal === "posture" ? "posture" : goalFeeling === "mobility" ? "mobility" : "core",
    primaryGoal === "weight_loss" ? "low-impact conditioning" : "control"
  ];

  const preview = {
    headline: buildHeadline(goalFeeling, primaryGoal),
    planSeed: buildPlanSeed(goalFeeling, constraints, weeklySessions),
    microInsights: [
      `Your best starting rhythm is ${weeklySessions} x ${preferredSessionMinutes}-minute sessions.`,
      maxImpact === "low"
        ? "Your first week should stay low-impact to protect consistency and joints."
        : "Your current activity level supports moderate progression.",
      motivationStyle === "data"
        ? "You are likely to respond well to visible weekly targets."
        : "Coach-style cues will help turn the plan into a repeatable ritual."
    ],
    sampleDay: buildSampleDay(focusAreas[0], preferredSessionMinutes),
    projectedRhythm: `${weeklySessions} sessions/week, about ${weeklyMinutes} focused minutes`
  };

  return {
    signals: {
      primaryGoal,
      goalFeeling,
      weeklyMinutes,
      preferredSessionMinutes,
      activityLevel,
      equipment,
      constraints,
      motivationStyle
    },
    scores: {
      readiness,
      consistency,
      intensityTolerance: intensityBase,
      recoveryNeed
    },
    riskFlags,
    planConstraints: {
      weeklySessions,
      sessionMinutes: preferredSessionMinutes,
      maxImpact,
      focusAreas,
      avoid: constraints.includes("knees")
        ? ["jumping", "deep squat pulses"]
        : constraints.includes("wrists")
          ? ["long plank holds"]
          : []
    },
    preview
  };
}

function buildHeadline(goalFeeling: string, primaryGoal: string) {
  const feeling = goalFeeling.replace("_", " ");
  const goal = primaryGoal.replace("_", " ");
  return `A ${feeling}-first Pilates plan built around ${goal}`;
}

function buildPlanSeed(goalFeeling: string, constraints: string[], sessions: number) {
  const safety = constraints.length > 0 ? "protected" : "open";
  return `${goalFeeling}-${sessions}x-${safety}`;
}

function buildSampleDay(focus: string, minutes: number) {
  return `${minutes}-minute ${focus} session: breath reset, controlled core block, mobility finisher.`;
}
