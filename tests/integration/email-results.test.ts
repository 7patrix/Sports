import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createSession } from "@/app/api/assessment-sessions/route";
import { POST as captureEmail } from "@/app/api/assessment-sessions/[sessionId]/email/route";
import { GET as getResult } from "@/app/api/results/[sessionId]/route";
import { prisma } from "@/lib/db";
import { dbConfigured, jsonRequest, makeParams, readJson } from "./helpers";

const suite = describe.skipIf(!dbConfigured);

type SessionPayload = { session: { id: string }; anonymousToken: string };

const createdTokens = new Set<string>();

async function startSession() {
  const response = await createSession(jsonRequest("http://test/api/assessment-sessions", {}));
  const data = await readJson<SessionPayload>(response as Response);
  createdTokens.add(data.anonymousToken);
  return data.session.id;
}

suite("email capture + result readiness", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    for (const token of createdTokens) {
      await prisma.assessmentSession.deleteMany({ where: { anonymousToken: token } });
    }
    await prisma.$disconnect();
  });

  it("stores a valid email and reports delivery status", async () => {
    const sessionId = await startSession();
    const response = await captureEmail(
      jsonRequest(`http://test/api/assessment-sessions/${sessionId}/email`, { email: "reviewer@example.com" }),
      makeParams(sessionId)
    );
    expect((response as Response).status).toBe(200);
    const data = await readJson<{ email: string; delivered: boolean }>(response as Response);
    expect(data.email).toBe("reviewer@example.com");
    // Without RESEND_API_KEY configured, delivery gracefully degrades to false.
    expect(typeof data.delivered).toBe("boolean");

    const stored = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    expect(stored?.email).toBe("reviewer@example.com");
  });

  it("rejects a malformed email with 422", async () => {
    const sessionId = await startSession();
    const response = await captureEmail(
      jsonRequest(`http://test/api/assessment-sessions/${sessionId}/email`, { email: "not-an-email" }),
      makeParams(sessionId)
    );
    expect((response as Response).status).toBe(422);
  });

  it("returns 404 when the result is not ready", async () => {
    const sessionId = await startSession();
    const response = await getResult(new Request("http://test"), makeParams(sessionId));
    expect((response as Response).status).toBe(404);
  });
});
