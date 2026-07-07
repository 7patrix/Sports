import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  MOCK_AI: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value === "true")
});

export const env = envSchema.parse(process.env);
