import { z } from "zod";

const envSchema = z.object({
  // A placeholder default keeps `next build` from failing when DATABASE_URL is
  // absent at build time (e.g. on Railway). The real value must be provided at
  // runtime; migrations use prisma.config.ts separately.
  DATABASE_URL: z.string().url().default("postgresql://placeholder:placeholder@localhost:5432/placeholder"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  MOCK_AI: z
    .string()
    .optional()
    .default("true")
    .transform((value) => value === "true")
});

export const env = envSchema.parse(process.env);
