import type { CoachNarrative, FullPlan, ScoredProfile } from "@/lib/contracts";
import { fullPlanSchema } from "@/lib/contracts";
import type { Locale } from "@/lib/locale";
import { generateCoachNarrative, reviewCoachNarrative } from "@/lib/model-client";

export type GenerationStep = {
  agent: "writer" | "reviewer";
  status: string;
  detail?: string;
};

export type GeneratedReport = {
  preview: ScoredProfile["preview"];
  fullPlan: FullPlan;
  generatedBy: "ai" | "fallback";
  trace: GenerationStep[];
  safety: {
    disclaimer: string;
    blockedClaims: string[];
    riskFlags: ScoredProfile["riskFlags"];
  };
};

const MAX_REVISIONS = 2;

/**
 * Runs a writer -> independent safety-reviewer reflection loop. The reviewer is
 * a separate LLM pass that can reject the writer's copy; the writer then revises
 * against the issues (up to MAX_REVISIONS). Only AI copy that the reviewer
 * approves is used; anything else falls back to deterministic copy. The
 * exercise structure is always deterministic regardless of AI.
 */
async function runNarrativeAgents(
  input: { profile: ScoredProfile; daysPerWeek: number; focus: string },
  locale: Locale
): Promise<{ narrative: CoachNarrative | null; trace: GenerationStep[] }> {
  const trace: GenerationStep[] = [];

  let narrative = await generateCoachNarrative(input, locale);
  if (!narrative) {
    trace.push({ agent: "writer", status: "skipped" });
    return { narrative: null, trace };
  }
  trace.push({ agent: "writer", status: "drafted" });

  for (let attempt = 1; attempt <= MAX_REVISIONS + 1; attempt++) {
    const verdict = await reviewCoachNarrative(input, narrative, locale);
    if (!verdict) {
      // Reviewer unreachable: do not trust unreviewed AI copy -> fall back.
      trace.push({ agent: "reviewer", status: "unavailable" });
      return { narrative: null, trace };
    }
    if (verdict.approved) {
      trace.push({ agent: "reviewer", status: "approved", detail: `attempt ${attempt}` });
      return { narrative, trace };
    }
    trace.push({ agent: "reviewer", status: "rejected", detail: verdict.issues.join("; ") || "unspecified" });

    if (attempt > MAX_REVISIONS) break;

    const revised = await generateCoachNarrative(input, locale, verdict.issues);
    if (!revised) {
      trace.push({ agent: "writer", status: "revision_failed" });
      return { narrative: null, trace };
    }
    trace.push({ agent: "writer", status: "revised", detail: `attempt ${attempt}` });
    narrative = revised;
  }

  // Exhausted revisions without approval -> safety-first fallback.
  return { narrative: null, trace };
}

export async function generateAssessmentReport(profile: ScoredProfile, locale: Locale = "en"): Promise<GeneratedReport> {
  const candidate = buildDeterministicPlan(profile, locale);
  const daysPerWeek = Math.min(profile.planConstraints.weeklySessions, 5);
  const focus = profile.planConstraints.focusAreas[0] ?? "core";

  const { narrative, trace } = await runNarrativeAgents({ profile, daysPerWeek, focus }, locale);

  let generatedBy: "ai" | "fallback" = "fallback";
  if (narrative) {
    candidate.summary = narrative.summary;
    candidate.coachNote = narrative.coachNote;
    generatedBy = "ai";
  } else {
    candidate.coachNote =
      locale === "zh"
        ? "先把节奏稳住，坚持比强度更重要；有不适就调整动作，而不是硬撑。"
        : "Lock in the rhythm first - consistency beats intensity. Modify instead of pushing through discomfort.";
  }
  candidate.generatedBy = generatedBy;

  const fullPlan = fullPlanSchema.parse(candidate);

  return {
    preview: profile.preview,
    fullPlan,
    generatedBy,
    trace,
    safety: {
      disclaimer:
        locale === "zh"
          ? "本计划仅作为健身训练建议，不构成医疗诊断或治疗建议。如训练中出现疼痛、头晕或麻木，请停止并咨询专业人士。"
          : "This plan is educational fitness guidance, not medical advice. Stop if pain occurs and consult a qualified professional for medical concerns.",
      blockedClaims: [],
      riskFlags: profile.riskFlags
    }
  };
}

function buildDeterministicPlan(profile: ScoredProfile, locale: Locale): FullPlan {
  const { planConstraints, signals } = profile;
  const daysPerWeek = Math.min(planConstraints.weeklySessions, 5);
  const focus = planConstraints.focusAreas[0] ?? "core";
  const lowImpactNote =
    planConstraints.maxImpact === "low"
      ? locale === "zh"
        ? "所有动作都保持低冲击，只在无痛范围内完成可控幅度。"
        : "Keep every movement low-impact and choose the smallest pain-free range."
      : locale === "zh"
        ? "先把动作节奏做稳，再逐步增加强度。"
        : "Use controlled tempo before adding intensity.";

  return {
    version: 1,
    summary:
      locale === "zh"
        ? `${profile.preview.headline}。计划安排每周 ${daysPerWeek} 次训练，优先关注${translateFocus(focus)}。`
        : `${profile.preview.headline}. The plan uses ${daysPerWeek} weekly sessions and prioritizes ${focus}.`,
    weeks: Array.from({ length: 4 }, (_, weekIndex) => ({
      week: weekIndex + 1,
      theme:
        locale === "zh"
          ? ["建立基础", "提升控制", "强化力量", "稳定坚持"][weekIndex]
          : ["Foundation", "Control", "Strength", "Confidence"][weekIndex],
      days: Array.from({ length: daysPerWeek }, (_, dayIndex) => ({
        day: dayIndex + 1,
        title:
          locale === "zh"
            ? `${translateFocus(focus)}训练日 ${dayIndex + 1}`
            : `${focus} day ${dayIndex + 1}`,
        durationMinutes: planConstraints.sessionMinutes,
        focus,
        exercises: [
          {
            name:
              locale === "zh"
                ? signals.equipment.includes("wall")
                  ? "靠墙卷动配合呼吸"
                  : "仰卧呼吸调整"
                : signals.equipment.includes("wall")
                  ? "Wall roll-down breathing"
                  : "Supine breathing reset",
            sets: 2,
            reps: locale === "zh" ? "45 秒" : "45 seconds",
            restSeconds: 20,
            safetyNote: lowImpactNote
          },
          {
            name:
              locale === "zh"
                ? focus === "mobility"
                  ? "猫牛式过渡到婴儿式"
                  : "死虫式交替伸展"
                : focus === "mobility"
                  ? "Cat-cow to child's pose"
                  : "Dead bug reach",
            sets: 3,
            reps: locale === "zh" ? "每侧 8 次" : "8 each side",
            restSeconds: 30
          },
          {
            name:
              locale === "zh"
                ? planConstraints.avoid.includes("long plank holds")
                  ? "臀桥交替抬腿"
                  : "上斜平板轻点"
                : planConstraints.avoid.includes("long plank holds")
                  ? "Glute bridge march"
                  : "Incline plank tap",
            sets: 3,
            reps: locale === "zh" ? "30 秒" : "30 seconds",
            restSeconds: 40,
            safetyNote: planConstraints.avoid.join(", ") || undefined
          }
        ]
      }))
    })),
    progressionRules:
      locale === "zh"
        ? ["只有当前一周动作稳定可控时，下一周才增加一组。", "第一周主观用力保持在 10 分制的 6-7 分。", "状态不好时先缩小动作幅度，而不是直接跳过训练。"]
        : [
            "Add one set only when the previous week felt controlled.",
            "Keep effort around 6-7 out of 10 in week one.",
            "Reduce range of motion before skipping a session."
          ],
    safetyNotes: [
      lowImpactNote,
      locale === "zh" ? "如果出现尖锐疼痛、头晕或麻木，请立即停止训练。" : "Sharp pain, dizziness, or numbness means stop the session.",
      ...profile.riskFlags.map((flag) => flag.message)
    ],
    adjustmentSuggestions:
      locale === "zh"
        ? [
            "时间紧张时，完成前两个动作也算保住一次训练。",
            "如果酸痛超过 48 小时，下一次先重复上一周强度。",
            "动力下降时，先连续两次固定同一时间训练，再考虑调整计划。"
          ]
        : [
            "If time is tight, complete the first two exercises and mark the session as kept.",
            "If soreness lasts more than 48 hours, repeat the previous week.",
            "If motivation drops, use the same time slot for two sessions before changing the plan."
          ]
  };
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
