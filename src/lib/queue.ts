import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";

export const assessmentQueueName = "assessment-report";

let connection: IORedis | undefined;
let queue: Queue | undefined;

export function getRedisConnection() {
  connection ??= new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });
  return connection;
}

export function getBullConnectionOptions() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined
  };
}

export function getAssessmentQueue() {
  queue ??= new Queue(assessmentQueueName, {
    connection: getBullConnectionOptions()
  });
  return queue;
}

export async function enqueueAssessmentReport(sessionId: string, reportJobId: string) {
  return getAssessmentQueue().add(
    "generate-report",
    { sessionId, reportJobId },
    {
      jobId: reportJobId,
      attempts: 2,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}
