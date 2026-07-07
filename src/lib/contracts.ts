import { z } from "zod";

export const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.object({}).passthrough()
]);

export const answerInputSchema = z.object({
  questionId: z.string().min(1),
  value: answerValueSchema
});

export const createSessionSchema = z.object({
  anonymousToken: z.string().min(12).optional()
});

export const completeSessionSchema = z.object({
  anonymousToken: z.string().min(12)
});

export type AnswerValue = z.infer<typeof answerValueSchema>;

export type QuestionType = "single" | "multi" | "number" | "scale" | "text";

export type QuizOption = {
  label: string;
  value: string;
  insight?: string;
};

export type QuizQuestion = {
  id: string;
  chapter: "goal" | "body" | "lifestyle" | "constraints" | "motivation";
  type: QuestionType;
  title: string;
  subtitle?: string;
  required: boolean;
  options?: QuizOption[];
  min?: number;
  max?: number;
  unit?: string;
  why?: string;
};

export type QuizDefinitionContract = {
  slug: string;
  version: number;
  title: string;
  description: string;
  questions: QuizQuestion[];
};

export type HealthSignals = {
  primaryGoal: string;
  goalFeeling: string;
  weeklyMinutes: number;
  preferredSessionMinutes: number;
  activityLevel: "low" | "moderate" | "high";
  equipment: string[];
  constraints: string[];
  motivationStyle: string;
};

export type HealthScores = {
  readiness: number;
  consistency: number;
  intensityTolerance: number;
  recoveryNeed: number;
};

export type RiskFlag = {
  code: string;
  severity: "info" | "caution" | "stop";
  message: string;
};

export type PlanConstraints = {
  weeklySessions: number;
  sessionMinutes: number;
  maxImpact: "low" | "moderate";
  focusAreas: string[];
  avoid: string[];
};

export type AssessmentPreview = {
  headline: string;
  planSeed: string;
  microInsights: string[];
  sampleDay: string;
  projectedRhythm: string;
};

export type ScoredProfile = {
  signals: HealthSignals;
  scores: HealthScores;
  riskFlags: RiskFlag[];
  planConstraints: PlanConstraints;
  preview: AssessmentPreview;
};

export const workoutDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  durationMinutes: z.number(),
  focus: z.string(),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.string(),
      restSeconds: z.number(),
      safetyNote: z.string().optional()
    })
  )
});

export const fullPlanSchema = z.object({
  version: z.literal(1),
  summary: z.string(),
  weeks: z.array(
    z.object({
      week: z.number(),
      theme: z.string(),
      days: z.array(workoutDaySchema)
    })
  ),
  progressionRules: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  adjustmentSuggestions: z.array(z.string())
});

export type FullPlan = z.infer<typeof fullPlanSchema>;
