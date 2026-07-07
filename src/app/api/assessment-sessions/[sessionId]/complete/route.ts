import { NextResponse } from "next/server";
import type { AnswerValue } from "@/lib/contracts";
import { prisma } from "@/lib/db";
import { enqueueAssessmentReport } from "@/lib/queue";
import { recordFunnelEvent } from "@/lib/events";
import { activeQuiz } from "@/lib/quiz-definition";
import { scoreAssessment } from "@/lib/scoring";
import { handleApiError, jsonError } from "@/lib/api";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: true,
        profile: true,
        reportJobs: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    if (!session) return jsonError("Session not found", 404);

    const answeredIds = new Set(session.answers.map((answer) => answer.questionId));
    const missing = activeQuiz.questions
      .filter((question) => question.required && !answeredIds.has(question.id))
      .map((question) => question.id);

    if (missing.length > 0) return jsonError("Assessment is incomplete", 422, { missing });

    const answerMap = Object.fromEntries(
      session.answers.map((answer) => [answer.questionId, answer.value])
    ) as Record<string, AnswerValue>;
    const profile = scoreAssessment(answerMap);

    const updated = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.assessmentProfile.upsert({
        where: { sessionId },
        create: {
          sessionId,
          signals: profile.signals,
          scores: profile.scores,
          riskFlags: profile.riskFlags,
          planConstraints: profile.planConstraints,
          preview: profile.preview
        },
        update: {
          signals: profile.signals,
          scores: profile.scores,
          riskFlags: profile.riskFlags,
          planConstraints: profile.planConstraints,
          preview: profile.preview
        }
      });

      const completedSession = await tx.assessmentSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          completedAt: session.completedAt ?? new Date(),
          previewUnlocked: true
        }
      });

      const existingJob = session.reportJobs.find((job) =>
        ["PENDING", "RUNNING", "SUCCEEDED"].includes(job.status)
      );
      const reportJob =
        existingJob ??
        (await tx.reportJob.create({
          data: {
            sessionId,
            status: "PENDING",
            progress: 0,
            stage: "queued"
          }
        }));

      return { session: completedSession, profile: savedProfile, reportJob };
    });

    if (updated.reportJob.status === "PENDING") {
      await enqueueAssessmentReport(sessionId, updated.reportJob.id);
    }

    await recordFunnelEvent("assessment_completed", { reportJobId: updated.reportJob.id }, sessionId);

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
