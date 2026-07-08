import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config();
import { activeQuiz } from "../src/lib/quiz-definition";
import { scoreAssessment } from "../src/lib/scoring";
import { generateAssessmentReport } from "../src/lib/report-generator";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
});

const demoAnswers: Record<string, unknown> = {
  goal_feeling: "mobility",
  primary_goal: "weight_loss",
  target_timeline: "one_month",
  gender: "female",
  age: 32,
  height_cm: 168,
  weight_kg: 72,
  target_weight_kg: 63,
  activity_level: "low",
  sleep_quality: "ok",
  weekly_sessions: 3,
  session_minutes: "18",
  preferred_time: "evening",
  equipment: ["mat", "wall"],
  limitations: ["knees"],
  pain_now: "none",
  motivation_style: "coach",
  past_struggle: "time",
  commitment: "modify",
  diet_style: "balanced",
  water_intake: "medium"
};

async function upsertCompletedSession(quizId: string, quizVersion: number, token: string, paid: boolean) {
  const session = await prisma.assessmentSession.upsert({
    where: { anonymousToken: token },
    create: {
      anonymousToken: token,
      quizDefinitionId: quizId,
      quizVersion,
      status: "COMPLETED",
      subscriptionStatus: paid ? "ACTIVE" : "FREE",
      currentStep: activeQuiz.questions.length,
      completedAt: new Date(),
      previewUnlocked: true
    },
    update: {
      status: "COMPLETED",
      subscriptionStatus: paid ? "ACTIVE" : "FREE",
      currentStep: activeQuiz.questions.length,
      completedAt: new Date(),
      previewUnlocked: true
    }
  });

  for (const question of activeQuiz.questions) {
    await prisma.assessmentAnswer.upsert({
      where: { sessionId_questionId: { sessionId: session.id, questionId: question.id } },
      create: {
        sessionId: session.id,
        questionId: question.id,
        value: demoAnswers[question.id] as never,
        chapter: question.chapter
      },
      update: { value: demoAnswers[question.id] as never, chapter: question.chapter }
    });
  }

  const profile = scoreAssessment(demoAnswers as never);
  await prisma.assessmentProfile.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      signals: profile.signals,
      scores: profile.scores,
      riskFlags: profile.riskFlags,
      planConstraints: profile.planConstraints,
      preview: profile.preview,
      healthMetrics: profile.healthMetrics ?? undefined
    },
    update: {
      signals: profile.signals,
      scores: profile.scores,
      riskFlags: profile.riskFlags,
      planConstraints: profile.planConstraints,
      preview: profile.preview,
      healthMetrics: profile.healthMetrics ?? undefined
    }
  });

  const report = await generateAssessmentReport(profile);
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
  await prisma.assessmentResult.create({
    data: {
      sessionId: session.id,
      reportJobId: reportJob.id,
      previewPayload: report.preview,
      fullPayload: report.fullPlan,
      safetyPayload: report.safety
    }
  });

  if (paid) {
    const entitlement = await prisma.entitlement.upsert({
      where: { sessionId_scope: { sessionId: session.id, scope: "assessment.full_plan" } },
      create: { sessionId: session.id, scope: "assessment.full_plan", status: "ACTIVE" },
      update: { status: "ACTIVE" }
    });
    await prisma.payment.upsert({
      where: { providerRef: `seed_paid_${token}` },
      create: { sessionId: session.id, entitlementId: entitlement.id, providerRef: `seed_paid_${token}`, amountCents: 1900, status: "PAID" },
      update: { status: "PAID", entitlementId: entitlement.id }
    });
  } else {
    // Keep the unpaid demo reliably re-runnable: strip any prior payment/entitlement
    // (e.g. left over from a /pay smoke test) so it always starts masked.
    await prisma.entitlement.deleteMany({ where: { sessionId: session.id } });
    await prisma.payment.deleteMany({ where: { sessionId: session.id } });
  }

  return session;
}

async function main() {
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
    update: {
      title: activeQuiz.title,
      description: activeQuiz.description,
      questions: activeQuiz.questions,
      isActive: true
    }
  });

  // Pre-paid session: reviewers see the full, unlocked result immediately.
  const paid = await upsertCompletedSession(quiz.id, quiz.version, "demo-health-twin-token", true);
  // Unpaid session: reviewers can call POST /api/pay against it and diff before/after.
  const unpaid = await upsertCompletedSession(quiz.id, quiz.version, "demo-health-twin-unpaid", false);

  await prisma.funnelEvent.create({
    data: {
      sessionId: paid.id,
      type: "seed_demo_ready",
      payload: { paidToken: "demo-health-twin-token", unpaidToken: "demo-health-twin-unpaid", seedRunId: randomUUID() }
    }
  });

  console.log(`Seeded quiz ${quiz.slug}@${quiz.version}`);
  console.log(`  paid demo session:   ${paid.id} (token demo-health-twin-token)`);
  console.log(`  unpaid demo session: ${unpaid.id} (token demo-health-twin-unpaid)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
