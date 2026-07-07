import { Worker } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/db";
import { generateAssessmentReport } from "../../src/lib/report-generator";
import { assessmentQueueName, getBullConnectionOptions } from "../../src/lib/queue";
import type { ScoredProfile } from "../../src/lib/contracts";

type AssessmentJobData = {
  sessionId: string;
  reportJobId: string;
};

async function log(jobId: string, stage: string, message: string, metadata?: Record<string, unknown>) {
  await prisma.agentLog.create({
    data: { jobId, stage, message, metadata: metadata as Prisma.InputJsonValue | undefined }
  });
}

async function updateJob(jobId: string, stage: string, progress: number) {
  await prisma.reportJob.update({
    where: { id: jobId },
    data: { stage, progress, status: "RUNNING", startedAt: new Date() }
  });
}

const worker = new Worker<AssessmentJobData>(
  assessmentQueueName,
  async (bullJob) => {
    const { sessionId, reportJobId } = bullJob.data;

    try {
      await updateJob(reportJobId, "mapping_signals", 15);
      await log(reportJobId, "mapping_signals", "Loaded deterministic profile and normalized health signals.");

      const session = await prisma.assessmentSession.findUnique({
        where: { id: sessionId },
        include: { profile: true }
      });

      if (!session?.profile) {
        throw new Error("Assessment profile is missing; complete scoring before report generation.");
      }

      const profile: ScoredProfile = {
        signals: session.profile.signals as ScoredProfile["signals"],
        scores: session.profile.scores as ScoredProfile["scores"],
        riskFlags: session.profile.riskFlags as ScoredProfile["riskFlags"],
        planConstraints: session.profile.planConstraints as ScoredProfile["planConstraints"],
        preview: session.profile.preview as ScoredProfile["preview"]
      };

      await prisma.reportArtifact.create({
        data: {
          jobId: reportJobId,
          type: "health-profile",
          version: 1,
          payload: profile
        }
      });

      await updateJob(reportJobId, "building_plan", 45);
      await log(reportJobId, "building_plan", "Generated a four-week Pilates plan from structured constraints.");
      const report = await generateAssessmentReport(profile);

      await updateJob(reportJobId, "safety_review", 72);
      await log(reportJobId, "safety_review", "Checked plan language for unsafe claims and contraindication handling.");

      await prisma.reportArtifact.createMany({
        data: [
          {
            jobId: reportJobId,
            type: "workout-plan",
            version: 1,
            payload: report.fullPlan
          },
          {
            jobId: reportJobId,
            type: "safety-review",
            version: 1,
            payload: report.safety
          }
        ]
      });

      await updateJob(reportJobId, "publishing", 90);
      await log(reportJobId, "publishing", "Published preview and entitlement-gated full plan.");

      await prisma.assessmentResult.create({
        data: {
          sessionId,
          reportJobId,
          previewPayload: report.preview,
          fullPayload: report.fullPlan,
          safetyPayload: report.safety
        }
      });

      await prisma.reportJob.update({
        where: { id: reportJobId },
        data: {
          status: "SUCCEEDED",
          progress: 100,
          stage: "ready",
          finishedAt: new Date()
        }
      });
    } catch (error) {
      await prisma.reportJob.update({
        where: { id: reportJobId },
        data: {
          status: "FAILED",
          stage: "failed",
          error: error instanceof Error ? error.message : "Unknown worker error",
          finishedAt: new Date()
        }
      });
      throw error;
    }
  },
  { connection: getBullConnectionOptions() }
);

worker.on("completed", (job) => {
  console.log(`Assessment job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Assessment job ${job?.id} failed`, error);
});

console.log(`Worker listening on ${assessmentQueueName}`);
