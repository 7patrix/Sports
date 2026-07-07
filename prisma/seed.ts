import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { activeQuiz } from "../src/lib/quiz-definition";
import { scoreAssessment } from "../src/lib/scoring";
import { generateAssessmentReport } from "../src/lib/report-generator";

const prisma = new PrismaClient();

async function main() {
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

  const anonymousToken = "demo-health-twin-token";
  const session = await prisma.assessmentSession.upsert({
    where: { anonymousToken },
    create: {
      anonymousToken,
      quizDefinitionId: quiz.id,
      quizVersion: quiz.version,
      status: "COMPLETED",
      currentStep: activeQuiz.questions.length,
      completedAt: new Date(),
      previewUnlocked: true
    },
    update: {
      status: "COMPLETED",
      currentStep: activeQuiz.questions.length,
      completedAt: new Date(),
      previewUnlocked: true
    }
  });

  const demoAnswers = {
    goal_feeling: "mobility",
    primary_goal: "posture",
    age_range: "30_39",
    activity_level: "low",
    weekly_sessions: 3,
    session_minutes: "18",
    equipment: ["mat", "wall"],
    limitations: ["knees"],
    motivation_style: "coach",
    commitment: "modify"
  };

  for (const question of activeQuiz.questions) {
    await prisma.assessmentAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId: question.id
        }
      },
      create: {
        sessionId: session.id,
        questionId: question.id,
        value: demoAnswers[question.id as keyof typeof demoAnswers],
        chapter: question.chapter
      },
      update: {
        value: demoAnswers[question.id as keyof typeof demoAnswers],
        chapter: question.chapter
      }
    });
  }

  const profile = scoreAssessment(demoAnswers);
  await prisma.assessmentProfile.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
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

  const reportJob = await prisma.reportJob.create({
    data: {
      sessionId: session.id,
      status: "SUCCEEDED",
      progress: 100,
      stage: "ready",
      startedAt: new Date(),
      finishedAt: new Date()
    }
  });
  const report = await generateAssessmentReport(profile);

  await prisma.assessmentResult.create({
    data: {
      sessionId: session.id,
      reportJobId: reportJob.id,
      previewPayload: report.preview,
      fullPayload: report.fullPlan,
      safetyPayload: report.safety
    }
  });

  await prisma.payment.upsert({
    where: { providerRef: "mock_seed_paid" },
    create: {
      sessionId: session.id,
      providerRef: "mock_seed_paid",
      amountCents: 1900,
      status: "PAID"
    },
    update: {
      status: "PAID"
    }
  });

  await prisma.entitlement.upsert({
    where: {
      sessionId_scope: {
        sessionId: session.id,
        scope: "assessment.full_plan"
      }
    },
    create: {
      sessionId: session.id,
      scope: "assessment.full_plan",
      status: "ACTIVE"
    },
    update: {
      status: "ACTIVE"
    }
  });

  await prisma.funnelEvent.create({
    data: {
      sessionId: session.id,
      type: "seed_demo_ready",
      payload: { token: anonymousToken, seedRunId: randomUUID() }
    }
  });

  console.log(`Seeded quiz ${quiz.slug}@${quiz.version} and demo session ${session.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
