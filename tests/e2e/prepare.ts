import { execFileSync } from "node:child_process";
import postgres from "postgres";

/**
 * Runs as part of the web server command, before `next build`, so the build and the server
 * only ever see the freshly seeded data (Playwright starts web servers before globalSetup).
 */
async function ensureDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const name = url.pathname.slice(1);
  url.pathname = "/postgres";
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    const rows = await sql`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (rows.length === 0) await sql.unsafe(`CREATE DATABASE "${name.replaceAll('"', "")}"`);
  } finally {
    await sql.end();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  await ensureDatabase(databaseUrl);
  const env = { ...process.env, SEED_LISTINGS: process.env.SEED_LISTINGS ?? "300" };
  execFileSync("pnpm", ["exec", "tsx", "src/db/migrate.ts"], { env, stdio: "inherit" });
  execFileSync("pnpm", ["exec", "tsx", "src/db/seed/index.ts"], { env, stdio: "inherit" });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
