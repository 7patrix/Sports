import "dotenv/config";
import { Worker } from "bullmq";
import { assessmentQueueName, getBullConnectionOptions } from "../../src/lib/queue";
import { processAssessmentJob, type AssessmentJobData } from "./handler";

const worker = new Worker<AssessmentJobData>(
  assessmentQueueName,
  async (bullJob) => {
    await processAssessmentJob(bullJob.data);
  },
  { connection: getBullConnectionOptions() }
);

worker.on("completed", (job) => {
  console.log(`Assessment job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Assessment job ${job?.id} failed`, error);
});

console.log(`Worker listening on ${assessmentQueueName}`);
