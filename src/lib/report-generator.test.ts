import { describe, expect, it } from "vitest";
import { generateAssessmentReport } from "@/lib/report-generator";
import { scoreAssessment } from "@/lib/scoring";

describe("generateAssessmentReport", () => {
  it("returns a schema-valid full plan and safety disclaimer", async () => {
    const profile = scoreAssessment({
      goal_feeling: "core",
      primary_goal: "strength",
      activity_level: "moderate",
      weekly_sessions: 4,
      session_minutes: "25",
      equipment: ["mat", "band"],
      limitations: ["wrists"],
      motivation_style: "streaks"
    });

    const report = await generateAssessmentReport(profile);

    expect(report.fullPlan.version).toBe(1);
    expect(report.fullPlan.weeks).toHaveLength(4);
    expect(report.fullPlan.safetyNotes.join(" ")).toContain("wrist");
    expect(report.safety.disclaimer).toContain("not medical advice");
  });
});
