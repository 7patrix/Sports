import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasFullAccess } from "@/lib/entitlement";
import type { HealthMetrics } from "@/lib/health-metrics";
import { handleApiError, jsonError } from "@/lib/api";

type Params = {
  params: Promise<{ sessionId: string }>;
};

/**
 * Non-members get a redacted view: BMI (a hook), but the concrete prediction
 * data - recommended intake, target date and the projection curve - is stripped
 * out and flagged as locked. Members get the full metrics.
 */
function maskHealthMetrics(metrics: HealthMetrics | null, fullAccess: boolean) {
  if (!metrics) return null;
  if (fullAccess) return { ...metrics, locked: false };
  return {
    bmi: metrics.bmi,
    bmiCategory: metrics.bmiCategory,
    goalDirection: metrics.goalDirection,
    bmr: null,
    tdee: null,
    recommendedCalories: null,
    macros: null,
    weeklyRateKg: null,
    weeksToGoal: null,
    targetDateIso: null,
    projection: null,
    locked: true
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;

    // Independent reads run in parallel to cut round-trips.
    const [result, profile, session, fullAccess] = await Promise.all([
      prisma.assessmentResult.findFirst({ where: { sessionId }, orderBy: { createdAt: "desc" } }),
      prisma.assessmentProfile.findUnique({
        where: { sessionId },
        select: { scores: true, healthMetrics: true }
      }),
      prisma.assessmentSession.findUnique({
        where: { id: sessionId },
        select: { email: true, subscriptionStatus: true }
      }),
      hasFullAccess(sessionId)
    ]);

    if (!result) return jsonError("Result is not ready yet", 404);

    const metrics = (profile?.healthMetrics as HealthMetrics | null) ?? null;

    return NextResponse.json({
      access: fullAccess ? "full" : "preview",
      subscriptionStatus: session?.subscriptionStatus ?? "FREE",
      preview: result.previewPayload,
      fullPlan: fullAccess ? result.fullPayload : null,
      safety: result.safetyPayload,
      scores: profile?.scores ?? null,
      healthMetrics: maskHealthMetrics(metrics, fullAccess),
      email: session?.email ?? null
    });
  } catch (error) {
    return handleApiError(error);
  }
}
