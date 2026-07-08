import { describe, expect, it } from "vitest";
import { categorizeBmi, computeHealthMetrics, type HealthMetricsInput } from "@/lib/health-metrics";

const baseInput: HealthMetricsInput = {
  gender: "female",
  age: 32,
  heightCm: 168,
  weightKg: 72,
  targetWeightKg: 63,
  activityLevel: "low"
};

// Deterministic clock so target-date assertions are stable.
const fixedNow = new Date("2026-01-01T00:00:00.000Z");

describe("computeHealthMetrics", () => {
  it("computes BMI from height and weight", () => {
    const metrics = computeHealthMetrics(baseInput, fixedNow);
    // 72 / (1.68^2) = 25.5
    expect(metrics.bmi).toBe(25.5);
    expect(metrics.bmiCategory).toBe("overweight");
  });

  it("uses the Mifflin-St Jeor equation with a female offset", () => {
    const metrics = computeHealthMetrics(baseInput, fixedNow);
    // 10*72 + 6.25*168 - 5*32 - 161 = 1449
    expect(metrics.bmr).toBe(1449);
    // TDEE = 1449 * 1.2 (low activity) = 1738.8 -> 1739
    expect(metrics.tdee).toBe(1739);
  });

  it("recommends a safe deficit for weight loss and never below the floor", () => {
    const metrics = computeHealthMetrics(baseInput, fixedNow);
    expect(metrics.goalDirection).toBe("lose");
    // 1739 - 500 = 1239, above the 1200 female floor
    expect(metrics.recommendedCalories).toBe(1239);

    const tiny = computeHealthMetrics(
      { ...baseInput, weightKg: 46, targetWeightKg: 44, heightCm: 150, age: 60 },
      fixedNow
    );
    expect(tiny.recommendedCalories).toBeGreaterThanOrEqual(1200);
  });

  it("adds a surplus for weight gain", () => {
    const metrics = computeHealthMetrics(
      { ...baseInput, weightKg: 55, targetWeightKg: 62 },
      fixedNow
    );
    expect(metrics.goalDirection).toBe("gain");
    expect(metrics.recommendedCalories).toBeGreaterThan(metrics.tdee);
  });

  it("returns maintain with no target date when weight equals target", () => {
    const metrics = computeHealthMetrics(
      { ...baseInput, weightKg: 63, targetWeightKg: 63 },
      fixedNow
    );
    expect(metrics.goalDirection).toBe("maintain");
    expect(metrics.weeksToGoal).toBe(0);
    expect(metrics.targetDateIso).toBeNull();
    expect(metrics.projection).toHaveLength(1);
  });

  it("projects a target date in the future for a deficit", () => {
    const metrics = computeHealthMetrics(baseInput, fixedNow);
    expect(metrics.weeksToGoal).toBeGreaterThan(0);
    expect(metrics.targetDateIso).not.toBeNull();
    expect(new Date(metrics.targetDateIso as string).getTime()).toBeGreaterThan(fixedNow.getTime());
    // Projection starts at current weight and ends at target weight.
    expect(metrics.projection[0].weightKg).toBe(72);
    expect(metrics.projection[metrics.projection.length - 1].weightKg).toBe(63);
  });

  it("produces macros that are all non-negative", () => {
    const metrics = computeHealthMetrics(baseInput, fixedNow);
    expect(metrics.macros.proteinG).toBeGreaterThan(0);
    expect(metrics.macros.carbsG).toBeGreaterThanOrEqual(0);
    expect(metrics.macros.fatG).toBeGreaterThan(0);
  });

  it("handles boundary heights and weights without throwing", () => {
    expect(() => computeHealthMetrics({ ...baseInput, heightCm: 120, weightKg: 35, targetWeightKg: 35 }, fixedNow)).not.toThrow();
    expect(() => computeHealthMetrics({ ...baseInput, heightCm: 230, weightKg: 250, targetWeightKg: 90 }, fixedNow)).not.toThrow();
  });

  it("caps extreme weight gaps at a sane number of weeks", () => {
    const metrics = computeHealthMetrics(
      { ...baseInput, weightKg: 250, targetWeightKg: 35, heightCm: 150 },
      fixedNow
    );
    expect(metrics.weeksToGoal).toBeLessThanOrEqual(104);
  });

  it("rejects illegal (non-finite / non-positive) inputs", () => {
    expect(() => computeHealthMetrics({ ...baseInput, heightCm: 0 }, fixedNow)).toThrow();
    expect(() => computeHealthMetrics({ ...baseInput, weightKg: Number.NaN }, fixedNow)).toThrow();
    expect(() => computeHealthMetrics({ ...baseInput, age: -5 }, fixedNow)).toThrow();
    expect(() => computeHealthMetrics({ ...baseInput, targetWeightKg: Number.POSITIVE_INFINITY }, fixedNow)).toThrow();
  });
});

describe("categorizeBmi", () => {
  it("classifies BMI thresholds correctly", () => {
    expect(categorizeBmi(17)).toBe("underweight");
    expect(categorizeBmi(18.5)).toBe("normal");
    expect(categorizeBmi(24.9)).toBe("normal");
    expect(categorizeBmi(25)).toBe("overweight");
    expect(categorizeBmi(30)).toBe("obese");
  });
});
