import type { AnswerValue, QuizQuestion } from "@/lib/contracts";

type AnswerMap = Record<string, AnswerValue>;

// A goal weight is only meaningful if it maps to a plausible target BMI. This
// blocks "each field is in range but the combination is absurd" inputs (e.g.
// target 40kg at 190cm -> BMI 11) that single-field validation cannot catch.
const MIN_TARGET_BMI = 13;
const MAX_TARGET_BMI = 60;

function numberFrom(value: AnswerValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function validateBiometricConsistency(answers: AnswerMap): AnswerValidationResult {
  const heightCm = numberFrom(answers.height_cm);
  const targetWeightKg = numberFrom(answers.target_weight_kg);

  // Only cross-check when both fields are present; per-field range is enforced
  // separately on save.
  if (heightCm === null || targetWeightKg === null) {
    return { ok: true, value: true };
  }

  const heightM = heightCm / 100;
  const targetBmi = targetWeightKg / (heightM * heightM);
  if (targetBmi < MIN_TARGET_BMI || targetBmi > MAX_TARGET_BMI) {
    return {
      ok: false,
      error: `target weight is not plausible for the given height (target BMI ${targetBmi.toFixed(1)})`
    };
  }
  return { ok: true, value: true };
}

export type AnswerValidationResult =
  | { ok: true; value: AnswerValue }
  | { ok: false; error: string };

/**
 * Server-side validation for a single answer against its question definition.
 *
 * This is the guard the spec asks for: it rejects illegal numeric injection and
 * out-of-range values, and it makes sure option-based answers only contain
 * allowed values. It is intentionally pure so boundary/illegal inputs can be
 * unit tested without a database.
 */
export function validateAnswer(question: QuizQuestion, value: AnswerValue): AnswerValidationResult {
  switch (question.type) {
    case "number":
      return validateNumber(question, value);
    case "scale":
      return validateScale(question, value);
    case "single":
      return validateSingle(question, value);
    case "multi":
      return validateMulti(question, value);
    case "text":
      return validateText(value);
    default:
      return { ok: false, error: `Unsupported question type: ${question.type}` };
  }
}

function toFiniteNumber(value: AnswerValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validateNumber(question: QuizQuestion, value: AnswerValue): AnswerValidationResult {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return { ok: false, error: `${question.id} must be a finite number` };
  }
  if (question.min !== undefined && numeric < question.min) {
    return { ok: false, error: `${question.id} must be >= ${question.min}` };
  }
  if (question.max !== undefined && numeric > question.max) {
    return { ok: false, error: `${question.id} must be <= ${question.max}` };
  }
  return { ok: true, value: numeric };
}

function validateScale(question: QuizQuestion, value: AnswerValue): AnswerValidationResult {
  const numeric = toFiniteNumber(value);
  if (numeric === null || !Number.isInteger(numeric)) {
    return { ok: false, error: `${question.id} must be an integer` };
  }
  if (question.min !== undefined && numeric < question.min) {
    return { ok: false, error: `${question.id} must be >= ${question.min}` };
  }
  if (question.max !== undefined && numeric > question.max) {
    return { ok: false, error: `${question.id} must be <= ${question.max}` };
  }
  return { ok: true, value: numeric };
}

function validateSingle(question: QuizQuestion, value: AnswerValue): AnswerValidationResult {
  if (typeof value !== "string") {
    return { ok: false, error: `${question.id} must be a string option value` };
  }
  const allowed = new Set((question.options ?? []).map((option) => option.value));
  if (allowed.size > 0 && !allowed.has(value)) {
    return { ok: false, error: `${value} is not a valid option for ${question.id}` };
  }
  return { ok: true, value };
}

function validateMulti(question: QuizQuestion, value: AnswerValue): AnswerValidationResult {
  if (!Array.isArray(value)) {
    return { ok: false, error: `${question.id} must be an array of option values` };
  }
  const allowed = new Set((question.options ?? []).map((option) => option.value));
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: `${question.id} options must be strings` };
    }
    if (allowed.size > 0 && !allowed.has(item)) {
      return { ok: false, error: `${item} is not a valid option for ${question.id}` };
    }
  }
  const unique = new Set(value);
  return { ok: true, value: Array.from(unique) };
}

function validateText(value: AnswerValue): AnswerValidationResult {
  if (typeof value !== "string") {
    return { ok: false, error: "Text answer must be a string" };
  }
  if (value.length > 500) {
    return { ok: false, error: "Text answer is too long" };
  }
  return { ok: true, value };
}
