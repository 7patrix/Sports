import { describe, expect, it } from "vitest";
import { validateAnswer, validateBiometricConsistency } from "@/lib/answer-validation";
import type { QuizQuestion } from "@/lib/contracts";

const numberQuestion: QuizQuestion = {
  id: "weight_kg",
  chapter: "body",
  type: "number",
  title: "Weight",
  required: true,
  min: 35,
  max: 250
};

const scaleQuestion: QuizQuestion = {
  id: "weekly_sessions",
  chapter: "lifestyle",
  type: "scale",
  title: "Sessions",
  required: true,
  min: 2,
  max: 6
};

const singleQuestion: QuizQuestion = {
  id: "gender",
  chapter: "body",
  type: "single",
  title: "Gender",
  required: true,
  options: [
    { label: "Female", value: "female" },
    { label: "Male", value: "male" }
  ]
};

const multiQuestion: QuizQuestion = {
  id: "equipment",
  chapter: "lifestyle",
  type: "multi",
  title: "Equipment",
  required: true,
  options: [
    { label: "Mat", value: "mat" },
    { label: "Band", value: "band" }
  ]
};

describe("validateAnswer - number", () => {
  it("accepts an in-range value and normalizes strings to numbers", () => {
    expect(validateAnswer(numberQuestion, 72)).toEqual({ ok: true, value: 72 });
    expect(validateAnswer(numberQuestion, "80")).toEqual({ ok: true, value: 80 });
  });

  it("rejects below-min and above-max values", () => {
    expect(validateAnswer(numberQuestion, 10).ok).toBe(false);
    expect(validateAnswer(numberQuestion, 999).ok).toBe(false);
  });

  it("rejects non-finite and non-numeric injection", () => {
    expect(validateAnswer(numberQuestion, Number.NaN).ok).toBe(false);
    expect(validateAnswer(numberQuestion, "70; DROP TABLE").ok).toBe(false);
    expect(validateAnswer(numberQuestion, { $gt: 0 } as never).ok).toBe(false);
    expect(validateAnswer(numberQuestion, ["70"] as never).ok).toBe(false);
  });
});

describe("validateAnswer - scale", () => {
  it("accepts integers within range", () => {
    expect(validateAnswer(scaleQuestion, 3)).toEqual({ ok: true, value: 3 });
  });

  it("rejects non-integers and out-of-range", () => {
    expect(validateAnswer(scaleQuestion, 3.5).ok).toBe(false);
    expect(validateAnswer(scaleQuestion, 9).ok).toBe(false);
  });
});

describe("validateAnswer - single", () => {
  it("accepts a valid option value", () => {
    expect(validateAnswer(singleQuestion, "female")).toEqual({ ok: true, value: "female" });
  });

  it("rejects unknown option values and non-strings", () => {
    expect(validateAnswer(singleQuestion, "alien").ok).toBe(false);
    expect(validateAnswer(singleQuestion, 1 as never).ok).toBe(false);
  });
});

describe("validateAnswer - multi", () => {
  it("accepts an array of valid values and de-duplicates", () => {
    const result = validateAnswer(multiQuestion, ["mat", "mat", "band"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(["mat", "band"]);
  });

  it("rejects non-arrays and unknown members", () => {
    expect(validateAnswer(multiQuestion, "mat" as never).ok).toBe(false);
    expect(validateAnswer(multiQuestion, ["mat", "rocket"]).ok).toBe(false);
  });
});

describe("validateBiometricConsistency", () => {
  it("accepts a plausible height/target-weight combination", () => {
    expect(validateBiometricConsistency({ height_cm: 168, target_weight_kg: 63 }).ok).toBe(true);
  });

  it("accepts string-encoded numbers", () => {
    expect(validateBiometricConsistency({ height_cm: "170", target_weight_kg: "65" }).ok).toBe(true);
  });

  it("rejects an absurdly low target BMI even when each field is in range", () => {
    // 35kg at 230cm -> BMI ~6.6
    expect(validateBiometricConsistency({ height_cm: 230, target_weight_kg: 35 }).ok).toBe(false);
  });

  it("rejects an absurdly high target BMI", () => {
    // 250kg at 120cm -> BMI ~173
    expect(validateBiometricConsistency({ height_cm: 120, target_weight_kg: 250 }).ok).toBe(false);
  });

  it("skips the cross-check when a field is missing", () => {
    expect(validateBiometricConsistency({ height_cm: 168 }).ok).toBe(true);
    expect(validateBiometricConsistency({}).ok).toBe(true);
  });
});
