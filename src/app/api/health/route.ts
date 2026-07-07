import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRedisConnection } from "@/lib/queue";

export async function GET() {
  const checks = {
    database: false,
    redis: false
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    const pong = await getRedisConnection().ping();
    checks.redis = pong === "PONG";
  } catch {
    checks.redis = false;
  }

  const ok = checks.database && checks.redis;

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
