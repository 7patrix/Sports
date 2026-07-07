import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function recordFunnelEvent(
  type: string,
  payload: Record<string, unknown>,
  sessionId?: string
) {
  await prisma.funnelEvent.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      sessionId
    }
  });
}
