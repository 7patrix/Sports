import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { orderBy: { answeredAt: "asc" } },
        profile: true,
        reportJobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            logs: { orderBy: { createdAt: "asc" } },
            artifacts: { orderBy: { createdAt: "asc" } }
          }
        },
        results: { orderBy: { createdAt: "desc" }, take: 1 },
        entitlements: true
      }
    });

    if (!session) return jsonError("Session not found", 404);

    return NextResponse.json({ session });
  } catch (error) {
    return handleApiError(error);
  }
}
