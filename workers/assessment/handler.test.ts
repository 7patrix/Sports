import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma client used by the handler. Defined via vi.hoisted so it is
// available inside the hoisted vi.mock factory below.
const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async () => []),
  agentLog: { create: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
  reportJob: { update: vi.fn(async () => ({})) },
  reportArtifact: { create: vi.fn(async () => ({})), createMany: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
  assessmentResult: { create: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})) },
  assessmentSession: { findUnique: vi.fn() }
}));

vi.mock("../../src/lib/db", () => ({ prisma: prismaMock }));

// Deterministic report so the test does not touch the network/AI.
vi.mock("../../src/lib/report-generator", () => ({
  generateAssessmentReport: vi.fn(async () => ({
    preview: { headline: "p" },
    fullPlan: { version: 1 },
    generatedBy: "fallback",
    trace: [{ agent: "writer", status: "skipped" }],
    safety: { disclaimer: "d", blockedClaims: [], riskFlags: [] }
  }))
}));

vi.mock("../../src/lib/metrics", () => ({ recordMetric: vi.fn() }));

import { processAssessmentJob } from "./handler";

const profileRow = {
  signals: {},
  scores: {},
  riskFlags: [],
  planConstraints: {},
  preview: { headline: "p" },
  healthMetrics: null
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processAssessmentJob", () => {
  it("cleans up prior outputs (idempotent) before writing new ones", async () => {
    prismaMock.assessmentSession.findUnique.mockResolvedValue({ id: "s1", profile: profileRow });

    await processAssessmentJob({ sessionId: "s1", reportJobId: "job1", locale: "en" });

    // Idempotent reset ran first (deleteMany inside the $transaction batch).
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.assessmentResult.deleteMany).toHaveBeenCalledWith({ where: { reportJobId: "job1" } });
    expect(prismaMock.reportArtifact.deleteMany).toHaveBeenCalledWith({ where: { jobId: "job1" } });
  });

  it("writes the result and marks the job SUCCEEDED on success", async () => {
    prismaMock.assessmentSession.findUnique.mockResolvedValue({ id: "s1", profile: profileRow });

    await processAssessmentJob({ sessionId: "s1", reportJobId: "job1", locale: "en" });

    expect(prismaMock.assessmentResult.create).toHaveBeenCalledTimes(1);
    const finalUpdate = (prismaMock.reportJob.update.mock.calls as unknown[][]).at(-1)?.[0];
    expect(finalUpdate).toMatchObject({ where: { id: "job1" }, data: { status: "SUCCEEDED", progress: 100 } });
  });

  it("marks the job FAILED and rethrows when the profile is missing", async () => {
    prismaMock.assessmentSession.findUnique.mockResolvedValue({ id: "s1", profile: null });

    await expect(processAssessmentJob({ sessionId: "s1", reportJobId: "job1", locale: "en" })).rejects.toThrow();

    const failedUpdate = (prismaMock.reportJob.update.mock.calls as unknown[][]).at(-1)?.[0];
    expect(failedUpdate).toMatchObject({ where: { id: "job1" }, data: { status: "FAILED" } });
    // No result should be written on the failure path.
    expect(prismaMock.assessmentResult.create).not.toHaveBeenCalled();
  });
});
