import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { answerInputSchema } from "@/lib/contracts";
import { prisma } from "@/lib/db";
import { recordFunnelEvent } from "@/lib/events";
import { activeQuiz } from "@/lib/quiz-definition";
import { validateAnswer } from "@/lib/answer-validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { handleApiError, jsonError } from "@/lib/api";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const limited = enforceRateLimit(request, "answers", { limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const { sessionId } = await params;
    const input = answerInputSchema.parse(await request.json());
    const questionIndex = activeQuiz.questions.findIndex((question) => question.id === input.questionId);
    const question = activeQuiz.questions[questionIndex];

    if (!question) return jsonError("Unknown question", 422);

    const validation = validateAnswer(question, input.value);
    if (!validation.ok) {
      return jsonError("Invalid answer value", 422, { questionId: question.id, reason: validation.error });
    }
    const normalizedValue = validation.value;

    const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } });
    if (!session) return jsonError("Session not found", 404);
    if (session.status !== "IN_PROGRESS") return jsonError("Completed sessions cannot be edited", 409);

    const answer = await prisma.assessmentAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: input.questionId
        }
      },
      create: {
        sessionId,
        questionId: input.questionId,
        value: normalizedValue as Prisma.InputJsonValue,
        chapter: question.chapter
      },
      update: {
        value: normalizedValue as Prisma.InputJsonValue,
        chapter: question.chapter,
        answeredAt: new Date()
      }
    });

    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        currentStep: Math.max(session.currentStep, questionIndex + 1)
      }
    });

    await recordFunnelEvent("answer_saved", { questionId: input.questionId, chapter: question.chapter }, sessionId);

    return NextResponse.json({ answer });
  } catch (error) {
    return handleApiError(error);
  }
}
