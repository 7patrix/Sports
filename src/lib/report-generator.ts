import type { FullPlan, ScoredProfile } from "@/lib/contracts";
import { fullPlanSchema } from "@/lib/contracts";

export type GeneratedReport = {
  preview: ScoredProfile["preview"];
  fullPlan: FullPlan;
  safety: {
    disclaimer: string;
    blockedClaims: string[];
    riskFlags: ScoredProfile["riskFlags"];
  };
};

export async function generateAssessmentReport(profile: ScoredProfile): Promise<GeneratedReport> {
  const candidate = buildDeterministicPlan(profile);
  const fullPlan = fullPlanSchema.parse(candidate);

  return {
    preview: profile.preview,
    fullPlan,
    safety: {
      disclaimer:
        "This plan is educational fitness guidance, not medical advice. Stop if pain occurs and consult a qualified professional for medical concerns.",
      blockedClaims: [],
      riskFlags: profile.riskFlags
    }
  };
}

function buildDeterministicPlan(profile: ScoredProfile): FullPlan {
  const { planConstraints, signals } = profile;
  const daysPerWeek = Math.min(planConstraints.weeklySessions, 5);
  const focus = planConstraints.focusAreas[0] ?? "core";
  const lowImpactNote =
    planConstraints.maxImpact === "low"
      ? "Keep every movement low-impact and choose the smallest pain-free range."
      : "Use controlled tempo before adding intensity.";

  return {
    version: 1,
    summary: `${profile.preview.headline}. The plan uses ${daysPerWeek} weekly sessions and prioritizes ${focus}.`,
    weeks: Array.from({ length: 4 }, (_, weekIndex) => ({
      week: weekIndex + 1,
      theme: ["Foundation", "Control", "Strength", "Confidence"][weekIndex],
      days: Array.from({ length: daysPerWeek }, (_, dayIndex) => ({
        day: dayIndex + 1,
        title: `${focus} day ${dayIndex + 1}`,
        durationMinutes: planConstraints.sessionMinutes,
        focus,
        exercises: [
          {
            name: signals.equipment.includes("wall") ? "Wall roll-down breathing" : "Supine breathing reset",
            sets: 2,
            reps: "45 seconds",
            restSeconds: 20,
            safetyNote: lowImpactNote
          },
          {
            name: focus === "mobility" ? "Cat-cow to child's pose" : "Dead bug reach",
            sets: 3,
            reps: "8 each side",
            restSeconds: 30
          },
          {
            name: planConstraints.avoid.includes("long plank holds") ? "Glute bridge march" : "Incline plank tap",
            sets: 3,
            reps: "30 seconds",
            restSeconds: 40,
            safetyNote: planConstraints.avoid.join(", ") || undefined
          }
        ]
      }))
    })),
    progressionRules: [
      "Add one set only when the previous week felt controlled.",
      "Keep effort around 6-7 out of 10 in week one.",
      "Reduce range of motion before skipping a session."
    ],
    safetyNotes: [
      lowImpactNote,
      "Sharp pain, dizziness, or numbness means stop the session.",
      ...profile.riskFlags.map((flag) => flag.message)
    ],
    adjustmentSuggestions: [
      "If time is tight, complete the first two exercises and mark the session as kept.",
      "If soreness lasts more than 48 hours, repeat the previous week.",
      "If motivation drops, use the same time slot for two sessions before changing the plan."
    ]
  };
}
