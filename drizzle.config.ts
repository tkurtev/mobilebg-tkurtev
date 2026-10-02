import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional when variables come from the environment
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: false,
});
