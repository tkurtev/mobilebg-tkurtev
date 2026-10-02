import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db, type Transaction } from "./client";
import * as s from "./schema";
import { insertCategories, insertLocations, insertMissingSettings, insertTaxonomy } from "./seed/reference";

/**
 * Production-safe database setup that runs before every Vercel build: applies migrations and
 * fills reference tables that are still empty. It never touches users, listings or anything
 * an admin has already changed, so it is safe to run repeatedly.
 */

// Neon exposes a direct connection next to the pooled one; migrations prefer it.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const SETUP_LOCK_KEY = 73_012_026;

async function isEmpty(tx: Transaction, table: PgTable): Promise<boolean> {
  const rows = await tx.select({ one: sql`1` }).from(table).limit(1);
  return rows.length === 0;
}

async function main() {
  const startedAt = Date.now();
  await migrate(db, { migrationsFolder: "src/db/migrations" });

  const filled = await db.transaction(async (tx) => {
    // Two deployments building at the same time must not insert the same rows twice.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SETUP_LOCK_KEY})`);
    const steps: string[] = [];
    if (await isEmpty(tx, s.regions)) {
      await insertLocations(tx);
      steps.push("regions and cities");
    }
    if (await isEmpty(tx, s.categories)) {
      await insertCategories(tx);
      steps.push("categories");
    }
    if (await isEmpty(tx, s.vehicleMakes)) {
      await insertTaxonomy(tx);
      steps.push("makes and models");
    }
    await insertMissingSettings(tx);
    return steps;
  });

  console.log(`Database ready in ${Date.now() - startedAt} ms${filled.length > 0 ? `; added ${filled.join(", ")}` : ""}`);
}

main()
  .catch((error: unknown) => {
    console.error("Database setup failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
