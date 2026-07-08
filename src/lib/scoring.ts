import type { AnswerValue, RiskFlag, ScoredProfile } from "@/lib/contracts";
import type { Locale } from "@/lib/locale";
import { computeHealthMetrics, type ActivityLevel, type Gender, type HealthMetrics } from "@/lib/health-metrics";

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

export function scoreAssessment(answers: AnswerMap, locale: Locale = "en"): ScoredProfile {
  const activityLevel = asString(answers.activity_level, "low") as "low" | "moderate" | "high";
  const weeklySessions = asNumber(answers.weekly_sessions, 3);
  const preferredSessionMinutes = asNumber(answers.session_minutes, 18);
  const constraints = asStringArray(answers.limitations).filter((item) => item !== "none");
  const equipment = asStringArray(answers.equipment).filter((item) => item !== "none");
  const goalFeeling = asString(answers.goal_feeling, "energy");
  const primaryGoal = asString(answers.primary_goal, "habit");
  const motivationStyle = asString(answers.motivation_style, "coach");
  const sleepQuality = asString(answers.sleep_quality, "");
  const painNow = asString(answers.pain_now, "");
  const dietStyle = asString(answers.diet_style, "");
  const waterIntake = asString(answers.water_intake, "");

  const sleepRecovery = sleepQuality === "poor" ? 14 : sleepQuality === "good" ? -6 : 0;
  const painRecovery = painNow === "moderate" ? 12 : painNow === "mild" ? 6 : 0;
  const painPenalty = painNow === "moderate" ? 20 : painNow === "mild" ? 10 : 0;

  const intensityBase = activityLevel === "high" ? 78 : activityLevel === "moderate" ? 62 : 42;
  const intensityTolerance = Math.max(20, intensityBase - painPenalty);
  const recoveryNeed = Math.max(
    15,
    Math.min(95, 35 + constraints.length * 14 + (preferredSessionMinutes > 25 ? 8 : 0) + sleepRecovery + painRecovery)
  );
  const consistency = Math.min(96, 48 + weeklySessions * 7 + (preferredSessionMinutes <= 18 ? 12 : 0));
  const readiness = Math.round((intensityBase + consistency + (100 - recoveryNeed)) / 3);

  const riskFlags: RiskFlag[] = constraints.map((constraint) => ({
    code: `care_${constraint}`,
    severity: "caution" as const,
    message:
      locale === "zh"
        ? `计划会为${translateConstraint(constraint)}加入替代动作，并避开容易诱发不适的进阶。`
        : `Plan should include ${constraint.replace("_", " ")} modifications and avoid pain-provoking progressions.`
  }));

  if (constraints.length >= 3) {
    riskFlags.push({
      code: "multi_area_care",
      severity: "stop",
      message:
        locale === "zh"
          ? "你选择了多个需要照顾的部位，计划会更保守；如果已经存在疼痛，建议先咨询专业人士。"
          : "Multiple limitation areas require conservative programming and a medical professional if pain is present."
    });
  }

  if (painNow === "mild" || painNow === "moderate") {
    riskFlags.push({
      code: `pain_${painNow}`,
      severity: painNow === "moderate" ? "stop" : "caution",
      message:
        locale === "zh"
          ? painNow === "moderate"
            ? "你目前有中等程度疼痛，第一周会保持温和；若疼痛持续或加重，请先咨询专业人士。"
            : "你目前有轻微疼痛，前期强度会更保守，并优先无痛范围内的动作。"
          : painNow === "moderate"
            ? "Moderate pain reported; week one stays gentle. Consult a professional if it persists or worsens."
            : "Mild pain reported; early intensity stays conservative and pain-free range is prioritized."
    });
  }

  const weeklyMinutes = weeklySessions * preferredSessionMinutes;
  const maxImpact =
    constraints.length > 0 || activityLevel === "low" || painNow === "mild" || painNow === "moderate" ? "low" : "moderate";
  const focusAreas = [
    primaryGoal === "posture" ? "posture" : goalFeeling === "mobility" ? "mobility" : "core",
    primaryGoal === "weight_loss" ? "low-impact conditioning" : "control"
  ];

  const microInsights = [
    locale === "zh"
      ? `更适合你的起步节奏是每周 ${weeklySessions} 次，每次 ${preferredSessionMinutes} 分钟。`
      : `Your best starting rhythm is ${weeklySessions} x ${preferredSessionMinutes}-minute sessions.`,
    maxImpact === "low"
      ? locale === "zh"
        ? "第一周会保持低冲击，优先保护关节和持续感。"
        : "Your first week should stay low-impact to protect consistency and joints."
      : locale === "zh"
        ? "你当前的活动基础支持温和进阶。"
        : "Your current activity level supports moderate progression.",
    motivationStyle === "data"
      ? locale === "zh"
        ? "你会更适合看得见、可追踪的每周目标。"
        : "You are likely to respond well to visible weekly targets."
      : locale === "zh"
        ? "教练式提示会帮助你把训练变成更容易重复的日常。"
        : "Coach-style cues will help turn the plan into a repeatable ritual."
  ];

  const nutritionInsight = buildNutritionInsight(sleepQuality, dietStyle, waterIntake, locale);
  if (nutritionInsight) microInsights.push(nutritionInsight);

  const healthMetrics = buildHealthMetrics(answers, activityLevel);

  const preview = {
    headline: buildHeadline(goalFeeling, primaryGoal, locale),
    planSeed: buildPlanSeed(goalFeeling, constraints, weeklySessions),
    microInsights,
    sampleDay: buildSampleDay(focusAreas[0], preferredSessionMinutes, locale),
    projectedRhythm:
      locale === "zh"
        ? `每周 ${weeklySessions} 次，共约 ${weeklyMinutes} 分钟训练`
        : `${weeklySessions} sessions/week, about ${weeklyMinutes} focused minutes`
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
      intensityTolerance,
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
    preview,
    healthMetrics
  };
}

const GENDERS: Gender[] = ["female", "male", "other"];

function buildHealthMetrics(answers: AnswerMap, activityLevel: ActivityLevel): HealthMetrics | null {
  const genderRaw = asString(answers.gender);
  const gender = (GENDERS as string[]).includes(genderRaw) ? (genderRaw as Gender) : "other";
  const age = asNumber(answers.age, NaN);
  const heightCm = asNumber(answers.height_cm, NaN);
  const weightKg = asNumber(answers.weight_kg, NaN);
  const targetWeightKg = asNumber(answers.target_weight_kg, NaN);

  if (![age, heightCm, weightKg, targetWeightKg].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }

  try {
    return computeHealthMetrics({ gender, age, heightCm, weightKg, targetWeightKg, activityLevel });
  } catch {
    return null;
  }
}

function buildNutritionInsight(sleepQuality: string, dietStyle: string, waterIntake: string, locale: Locale) {
  if (sleepQuality === "poor") {
    return locale === "zh"
      ? "睡眠偏弱，我们会把恢复放在首位，前期强度更温和。"
      : "Sleep is on the low side, so recovery comes first and early intensity stays gentle.";
  }
  if (waterIntake === "low") {
    return locale === "zh"
      ? "饮水偏少，计划里会加入训练前后的补水提醒。"
      : "Low hydration noted; the plan adds pre/post-session water reminders.";
  }
  if (dietStyle === "irregular") {
    return locale === "zh"
      ? "饮食不太规律，我们会建议围绕训练时间安排简单一致的加餐。"
      : "Irregular eating noted; we suggest simple, consistent fuel around your sessions.";
  }
  if (dietStyle === "high_protein") {
    return locale === "zh"
      ? "偏重蛋白的饮食有利于力量恢复，计划会配合进阶节奏。"
      : "Protein-focused eating supports strength recovery; the plan matches your progression.";
  }
  if (dietStyle === "high_carb") {
    return locale === "zh"
      ? "碳水偏多，适合把训练安排在能量较足的时段。"
      : "Carb-heavy eating pairs well with training when your energy is highest.";
  }
  if (dietStyle === "balanced") {
    return locale === "zh"
      ? "饮食较均衡，是稳定进步的良好基础。"
      : "Balanced eating is a solid base for steady progress.";
  }
  return undefined;
}

function buildHeadline(goalFeeling: string, primaryGoal: string, locale: Locale) {
  const feeling = goalFeeling.replace("_", " ");
  const goal = primaryGoal.replace("_", " ");
  if (locale === "zh") {
    return `一份围绕${translateGoalFeeling(goalFeeling)}和${translatePrimaryGoal(primaryGoal)}设计的普拉提计划`;
  }
  return `A ${feeling}-first Pilates plan built around ${goal}`;
}

function buildPlanSeed(goalFeeling: string, constraints: string[], sessions: number) {
  const safety = constraints.length > 0 ? "protected" : "open";
  return `${goalFeeling}-${sessions}x-${safety}`;
}

function buildSampleDay(focus: string, minutes: number, locale: Locale) {
  if (locale === "zh") {
    return `${minutes} 分钟${translateFocus(focus)}训练：呼吸调整、可控核心训练、舒展收尾。`;
  }
  return `${minutes}-minute ${focus} session: breath reset, controlled core block, mobility finisher.`;
}

function translateGoalFeeling(value: string) {
  return (
    {
      energy: "提升精力",
      mobility: "改善僵硬",
      core: "增强核心",
      tone: "塑造线条"
    }[value] ?? value
  );
}

function translatePrimaryGoal(value: string) {
  return (
    {
      weight_loss: "减重目标",
      strength: "力量提升",
      posture: "体态改善",
      habit: "习惯建立"
    }[value] ?? value
  );
}

function translateFocus(value: string) {
  return (
    {
      posture: "体态",
      mobility: "灵活性",
      core: "核心",
      "low-impact conditioning": "低冲击体能",
      control: "控制力"
    }[value] ?? value
  );
}

function translateConstraint(value: string) {
  return (
    {
      knees: "膝盖",
      back: "下背部",
      wrists: "手腕",
      neck_shoulders: "颈肩"
    }[value] ?? value
  );
}
