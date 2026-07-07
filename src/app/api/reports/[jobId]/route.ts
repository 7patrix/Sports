import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

type Params = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    const job = await prisma.reportJob.findUnique({
      where: { id: jobId },
      include: {
        logs: { orderBy: { createdAt: "asc" } },
        artifacts: { orderBy: { createdAt: "asc" } },
        results: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    if (!job) return jsonError("Report job not found", 404);

    return NextResponse.json({ job });
  } catch (error) {
    return handleApiError(error);
  }
}
