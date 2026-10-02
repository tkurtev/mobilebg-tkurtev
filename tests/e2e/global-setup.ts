import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../../playwright.config";

async function ensureDatabase() {
  const url = new URL(E2E_DATABASE_URL);
  const name = url.pathname.slice(1);
  url.pathname = "/postgres";
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    const rows = await sql`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (rows.length === 0) await sql.unsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await sql.end();
  }
}

/** Fresh, deterministic data for every E2E run. */
export default async function globalSetup() {
  await ensureDatabase();
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, SEED_LISTINGS: "300" };
  execFileSync("pnpm", ["exec", "tsx", "src/db/migrate.ts"], { env, stdio: "inherit" });
  execFileSync("pnpm", ["exec", "tsx", "src/db/seed/index.ts"], { env, stdio: "inherit" });
}
