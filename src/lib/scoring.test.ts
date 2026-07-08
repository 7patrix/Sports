import { describe, expect, it } from "vitest";
import { scoreAssessment } from "@/lib/scoring";

describe("scoreAssessment", () => {
  it("derives a conservative low-impact profile when limitations are present", () => {
    const profile = scoreAssessment({
      goal_feeling: "mobility",
      primary_goal: "posture",
      activity_level: "low",
      weekly_sessions: 3,
      session_minutes: "18",
      equipment: ["mat", "wall"],
      limitations: ["knees", "back"],
      motivation_style: "coach"
    });

    expect(profile.planConstraints.maxImpact).toBe("low");
    expect(profile.planConstraints.weeklySessions).toBe(3);
    expect(profile.riskFlags).toHaveLength(2);
    expect(profile.preview.microInsights.join(" ")).toContain("low-impact");
  });

  it("keeps the preview deterministic for the same answers", () => {
    const answers = {
      goal_feeling: "energy",
      primary_goal: "habit",
      activity_level: "moderate",
      weekly_sessions: 4,
      session_minutes: "25",
      equipment: ["mat"],
      limitations: ["none"],
      motivation_style: "data"
    };

    expect(scoreAssessment(answers).preview).toEqual(scoreAssessment(answers).preview);
  });

  it("reacts to pain, sleep and nutrition signals when provided", () => {
    const base = {
      goal_feeling: "energy",
      primary_goal: "strength",
      activity_level: "high",
      weekly_sessions: 4,
      session_minutes: "25",
      equipment: ["mat"],
      limitations: ["none"],
      motivation_style: "coach"
    };

    const calm = scoreAssessment(base);
    const strained = scoreAssessment({
      ...base,
      sleep_quality: "poor",
      pain_now: "moderate",
      water_intake: "low"
    });

    // Pain forces a low-impact plan even for an otherwise active user.
    expect(calm.planConstraints.maxImpact).toBe("moderate");
    expect(strained.planConstraints.maxImpact).toBe("low");

    // Pain adds a safety flag and lowers intensity tolerance.
    expect(strained.riskFlags.some((flag) => flag.code === "pain_moderate")).toBe(true);
    expect(strained.scores.intensityTolerance).toBeLessThan(calm.scores.intensityTolerance);

    // Poor sleep raises recovery need.
    expect(strained.scores.recoveryNeed).toBeGreaterThan(calm.scores.recoveryNeed);

    // A nutrition/recovery insight is appended when those signals exist.
    expect(strained.preview.microInsights.length).toBeGreaterThan(calm.preview.microInsights.length);
  });
});
