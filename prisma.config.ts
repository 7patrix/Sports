import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use process.env directly with a placeholder fallback so `prisma generate`
// (run in postinstall during the build image, where DATABASE_URL is absent)
// does not throw. `prisma migrate deploy` runs at deploy time with the real
// DATABASE_URL present in the environment.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: databaseUrl
  }
});
