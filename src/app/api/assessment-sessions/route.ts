import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionSchema } from "@/lib/contracts";
import { prisma } from "@/lib/db";
import { recordFunnelEvent } from "@/lib/events";
import { activeQuiz } from "@/lib/quiz-definition";
import { handleApiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const input = createSessionSchema.parse(await request.json().catch(() => ({})));
    const anonymousToken = input.anonymousToken ?? randomUUID();

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
      update: { isActive: true, questions: activeQuiz.questions }
    });

    const session = await prisma.assessmentSession.upsert({
      where: { anonymousToken },
      create: {
        anonymousToken,
        quizDefinitionId: quiz.id,
        quizVersion: quiz.version
      },
      update: {},
      include: {
        answers: true,
        profile: true,
        reportJobs: { orderBy: { createdAt: "desc" }, take: 1 },
        results: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    await recordFunnelEvent("session_started", { quizVersion: quiz.version }, session.id);

    return NextResponse.json({ session, anonymousToken });
  } catch (error) {
    return handleApiError(error);
  }
}
