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
});
