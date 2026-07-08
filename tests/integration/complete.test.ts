import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createSession } from "@/app/api/assessment-sessions/route";
import { PATCH as patchAnswer } from "@/app/api/assessment-sessions/[sessionId]/answers/route";
import { POST as complete } from "@/app/api/assessment-sessions/[sessionId]/complete/route";
import { prisma } from "@/lib/db";
import { getAssessmentQueue, getRedisConnection } from "@/lib/queue";
import { activeQuiz } from "@/lib/quiz-definition";
import type { QuizQuestion } from "@/lib/contracts";
import { dbConfigured, redisConfigured, jsonRequest, makeParams, readJson } from "./helpers";

const suite = describe.skipIf(!dbConfigured || !redisConfigured);

type SessionPayload = { session: { id: string }; anonymousToken: string };
type CompletePayload = {
  reportJob: { id: string; status: string };
  profile: { healthMetrics: unknown | null };
};

const createdTokens = new Set<string>();

const biometricOverrides: Record<string, number> = {
  age: 32,
  height_cm: 168,
  weight_kg: 72,
  target_weight_kg: 63
};

function validAnswerFor(question: QuizQuestion): unknown {
  switch (question.type) {
    case "number":
      return biometricOverrides[question.id] ?? question.min ?? 1;
    case "scale":
      return question.min ?? 1;
    case "single":
      return question.options?.[0]?.value ?? "";
    case "multi":
      return [question.options?.[0]?.value ?? ""];
    default:
      return "ok";
  }
}

async function startSession() {
  const response = await createSession(jsonRequest("http://test/api/assessment-sessions", {}));
  const data = await readJson<SessionPayload>(response as Response);
  createdTokens.add(data.anonymousToken);
  return data.session.id;
}

async function save(sessionId: string, questionId: string, value: unknown) {
  return patchAnswer(
    jsonRequest(`http://test/api/assessment-sessions/${sessionId}/answers`, { questionId, value }, "PATCH"),
    makeParams(sessionId)
  );
}

async function answerAll(sessionId: string, overrides: Record<string, unknown> = {}) {
  for (const question of activeQuiz.questions.filter((q) => q.required)) {
    const value = question.id in overrides ? overrides[question.id] : validAnswerFor(question);
    const response = await save(sessionId, question.id, value);
    if ((response as Response).status !== 200) {
      throw new Error(`failed to save ${question.id}: ${(response as Response).status}`);
    }
  }
}

async function completeSession(sessionId: string) {
  return complete(
    jsonRequest(`http://test/api/assessment-sessions/${sessionId}/complete`, { locale: "en" }),
    makeParams(sessionId)
  );
}

suite("assessment completion flow", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    for (const token of createdTokens) {
      await prisma.assessmentSession.deleteMany({ where: { anonymousToken: token } });
    }
    await getAssessmentQueue().close();
    getRedisConnection().disconnect();
    await prisma.$disconnect();
  });

  it("rejects an incomplete assessment with 422 and lists missing answers", async () => {
    const sessionId = await startSession();
    await save(sessionId, "goal_feeling", "mobility");

    const response = await completeSession(sessionId);
    expect((response as Response).status).toBe(422);
    const data = await readJson<{ details: { missing: string[] } }>(response as Response);
    expect(Array.isArray(data.details.missing)).toBe(true);
    expect(data.details.missing).toContain("primary_goal");
  });

  it("rejects biometrically inconsistent answers with 422", async () => {
    const sessionId = await startSession();
    // Every field is individually in-range, but target 35kg at 230cm -> BMI ~6.6.
    await answerAll(sessionId, { height_cm: 230, target_weight_kg: 35 });

    const response = await completeSession(sessionId);
    expect((response as Response).status).toBe(422);
    const data = await readJson<{ details: { reason?: string } }>(response as Response);
    expect(data.details.reason).toBeTruthy();
  });

  it("persists profile + health metrics and enqueues a report job", async () => {
    const sessionId = await startSession();
    await answerAll(sessionId);

    const response = await completeSession(sessionId);
    expect((response as Response).status).toBe(200);
    const data = await readJson<CompletePayload>(response as Response);

    expect(data.reportJob.id).toBeTruthy();
    expect(data.profile.healthMetrics).not.toBeNull();

    const saved = await prisma.assessmentProfile.findUnique({ where: { sessionId } });
    expect(saved?.healthMetrics).not.toBeNull();

    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    expect(session?.status).toBe("COMPLETED");
    expect(session?.previewUnlocked).toBe(true);
  });

  it("is idempotent: completing twice reuses the pending report job", async () => {
    const sessionId = await startSession();
    await answerAll(sessionId);

    const first = await readJson<CompletePayload>((await completeSession(sessionId)) as Response);
    const second = await readJson<CompletePayload>((await completeSession(sessionId)) as Response);

    expect(second.reportJob.id).toBe(first.reportJob.id);
    const jobs = await prisma.reportJob.findMany({ where: { sessionId } });
    expect(jobs).toHaveLength(1);
  });
});
