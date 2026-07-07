import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activeQuiz } from "@/lib/quiz-definition";

export async function GET() {
  const quiz = await prisma.quizDefinition.upsert({
    where: {
      slug_version: {
        slug: activeQuiz.slug,
        version: activeQuiz.version
      }
    },
    create: {
      slug: activeQuiz.slug,
      version: activeQuiz.version,
      title: activeQuiz.title,
      description: activeQuiz.description,
      questions: activeQuiz.questions,
      isActive: true
    },
    update: {
      title: activeQuiz.title,
      description: activeQuiz.description,
      questions: activeQuiz.questions,
      isActive: true
    }
  });

  return NextResponse.json({
    id: quiz.id,
    slug: quiz.slug,
    version: quiz.version,
    title: quiz.title,
    description: quiz.description,
    questions: activeQuiz.questions
  });
}
