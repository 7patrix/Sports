import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as pay } from "@/app/api/pay/route";
import { GET as getResult } from "@/app/api/results/[sessionId]/route";
import { prisma } from "@/lib/db";
import { scoreAssessment } from "@/lib/scoring";
import { activeQuiz } from "@/lib/quiz-definition";
import { dbConfigured, jsonRequest, makeParams, readJson } from "./helpers";

const suite = describe.skipIf(!dbConfigured);

type ResultPayload = {
  access: "preview" | "full";
  subscriptionStatus: "FREE" | "ACTIVE";
  fullPlan: unknown | null;
  healthMetrics: null | {
    bmi: number;
    recommendedCalories: number | null;
    targetDateIso: string | null;
    projection: unknown[] | null;
    locked: boolean;
  };
};

const tokens = new Set<string>();

async function buildCompletedSession() {
  const token = `it-${randomUUID()}`;
  tokens.add(token);

  const quiz = await prisma.quizDefinition.upsert({
    where: { slug_version: { slug: activeQuiz.slug, version: activeQuiz.version } },
    create: {
      slug: activeQuiz.slug,
      version: activeQuiz.version,
      title: activeQuiz.title,
      description: activeQuiz.description,
      questions: activeQuiz.questions,
      isActive: true
    },
    update: { isActive: true }
  });

  const answers = {
    goal_feeling: "mobility",
    primary_goal: "weight_loss",
    gender: "female",
    age: 32,
    height_cm: 168,
    weight_kg: 72,
    target_weight_kg: 63,
    activity_level: "low",
    weekly_sessions: 3,
    session_minutes: "18",
    limitations: ["knees"]
  };
  const profile = scoreAssessment(answers);

  const session = await prisma.assessmentSession.create({
    data: {
      anonymousToken: token,
      quizDefinitionId: quiz.id,
      quizVersion: quiz.version,
      status: "COMPLETED",
      completedAt: new Date(),
      previewUnlocked: true
    }
  });

  await prisma.assessmentProfile.create({
    data: {
      sessionId: session.id,
      signals: profile.signals,
      scores: profile.scores,
      riskFlags: profile.riskFlags,
      planConstraints: profile.planConstraints,
      preview: profile.preview,
      healthMetrics: profile.healthMetrics ?? undefined
    }
  });

  await prisma.assessmentResult.create({
    data: {
      sessionId: session.id,
      previewPayload: profile.preview,
      fullPayload: { summary: "full plan", weeks: [], progressionRules: [], safetyNotes: [], adjustmentSuggestions: [] },
      safetyPayload: { disclaimer: "not medical advice", riskFlags: profile.riskFlags }
    }
  });

  return session.id;
}

suite("subscription gating + pay callback", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    for (const token of tokens) {
      await prisma.assessmentSession.deleteMany({ where: { anonymousToken: token } });
    }
    await prisma.$disconnect();
  });

  it("masks the prediction data for non-members", async () => {
    const sessionId = await buildCompletedSession();
    const response = await getResult(new Request("http://test"), makeParams(sessionId));
    const data = await readJson<ResultPayload>(response as Response);

    expect(data.access).toBe("preview");
    expect(data.subscriptionStatus).toBe("FREE");
    expect(data.fullPlan).toBeNull();
    expect(data.healthMetrics?.locked).toBe(true);
    // BMI is a free hook; calories/target-date/projection are hidden.
    expect(typeof data.healthMetrics?.bmi).toBe("number");
    expect(data.healthMetrics?.recommendedCalories).toBeNull();
    expect(data.healthMetrics?.targetDateIso).toBeNull();
    expect(data.healthMetrics?.projection).toBeNull();
  });

  it("unlocks full data after the pay callback", async () => {
    const sessionId = await buildCompletedSession();

    const payResponse = await pay(jsonRequest("http://test/api/pay", { sessionId }));
    expect((payResponse as Response).status).toBe(200);
    const payData = await readJson<{ subscriptionStatus: string }>(payResponse as Response);
    expect(payData.subscriptionStatus).toBe("ACTIVE");

    // DB state actually flipped.
    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    expect(session?.subscriptionStatus).toBe("ACTIVE");

    const response = await getResult(new Request("http://test"), makeParams(sessionId));
    const data = await readJson<ResultPayload>(response as Response);
    expect(data.access).toBe("full");
    expect(data.fullPlan).not.toBeNull();
    expect(data.healthMetrics?.locked).toBe(false);
    expect(typeof data.healthMetrics?.recommendedCalories).toBe("number");
    expect(data.healthMetrics?.targetDateIso).not.toBeNull();
    expect(Array.isArray(data.healthMetrics?.projection)).toBe(true);
  });

  it("rejects paying for a non-existent session", async () => {
    const response = await pay(jsonRequest("http://test/api/pay", { sessionId: "does-not-exist" }));
    expect((response as Response).status).toBe(404);
  });
});
