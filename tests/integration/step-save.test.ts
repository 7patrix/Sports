import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as createSession } from "@/app/api/assessment-sessions/route";
import { PATCH as patchAnswer } from "@/app/api/assessment-sessions/[sessionId]/answers/route";
import { GET as getSession } from "@/app/api/assessment-sessions/[sessionId]/route";
import { prisma } from "@/lib/db";
import { dbConfigured, jsonRequest, makeParams, readJson } from "./helpers";

type SessionPayload = {
  session: { id: string; currentStep: number; answers: { questionId: string; value: unknown }[] };
  anonymousToken: string;
};

const suite = describe.skipIf(!dbConfigured);

const createdTokens = new Set<string>();

async function startSession(token?: string) {
  const response = await createSession(jsonRequest("http://test/api/assessment-sessions", token ? { anonymousToken: token } : {}));
  const data = await readJson<SessionPayload>(response as Response);
  createdTokens.add(data.anonymousToken);
  return data;
}

async function save(sessionId: string, questionId: string, value: unknown) {
  return patchAnswer(
    jsonRequest(`http://test/api/assessment-sessions/${sessionId}/answers`, { questionId, value }, "PATCH"),
    makeParams(sessionId)
  );
}

suite("step-wise save + progress recovery", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    for (const token of createdTokens) {
      await prisma.assessmentSession.deleteMany({ where: { anonymousToken: token } });
    }
    await prisma.$disconnect();
  });

  it("persists answers incrementally and advances currentStep", async () => {
    const { session } = await startSession();

    await save(session.id, "goal_feeling", "mobility");
    await save(session.id, "primary_goal", "weight_loss");

    const getResponse = await getSession(new Request("http://test"), makeParams(session.id));
    const data = await readJson<{ session: SessionPayload["session"] }>(getResponse as Response);

    const answerMap = Object.fromEntries(data.session.answers.map((a) => [a.questionId, a.value]));
    expect(answerMap.goal_feeling).toBe("mobility");
    expect(answerMap.primary_goal).toBe("weight_loss");
    expect(data.session.currentStep).toBeGreaterThan(0);
  });

  it("restores saved progress when resuming with the same token", async () => {
    const first = await startSession();
    await save(first.session.id, "goal_feeling", "core");

    const resumed = await startSession(first.anonymousToken);
    expect(resumed.session.id).toBe(first.session.id);
    const answerMap = Object.fromEntries(resumed.session.answers.map((a) => [a.questionId, a.value]));
    expect(answerMap.goal_feeling).toBe("core");
  });

  it("accepts out-of-order and duplicate submissions idempotently", async () => {
    const { session } = await startSession();

    // Answer a later question before an earlier one.
    await save(session.id, "water_intake", "high");
    await save(session.id, "goal_feeling", "energy");
    // Duplicate submit with a new value should overwrite, not duplicate.
    await save(session.id, "goal_feeling", "tone");

    const rows = await prisma.assessmentAnswer.findMany({
      where: { sessionId: session.id, questionId: "goal_feeling" }
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe("tone");
  });

  it("keeps a single consistent value under concurrent updates", async () => {
    const { session } = await startSession();

    await Promise.all([
      save(session.id, "weekly_sessions", 2),
      save(session.id, "weekly_sessions", 4),
      save(session.id, "weekly_sessions", 6)
    ]);

    const rows = await prisma.assessmentAnswer.findMany({
      where: { sessionId: session.id, questionId: "weekly_sessions" }
    });
    // The unique (sessionId, questionId) constraint guarantees exactly one row.
    expect(rows).toHaveLength(1);
    expect([2, 4, 6]).toContain(rows[0].value);
  });

  it("rejects out-of-range numeric injection with 422", async () => {
    const { session } = await startSession();

    const tooHeavy = await save(session.id, "weight_kg", 9999);
    expect((tooHeavy as Response).status).toBe(422);

    const notANumber = await save(session.id, "weight_kg", "70; DROP TABLE users");
    expect((notANumber as Response).status).toBe(422);

    const stored = await prisma.assessmentAnswer.findMany({
      where: { sessionId: session.id, questionId: "weight_kg" }
    });
    expect(stored).toHaveLength(0);

    const valid = await save(session.id, "weight_kg", 70);
    expect((valid as Response).status).toBe(200);
  });

  it("uses a random anonymous token to identify sessions", async () => {
    const explicit = randomUUID();
    const data = await startSession(explicit);
    expect(data.anonymousToken).toBe(explicit);
  });
});
