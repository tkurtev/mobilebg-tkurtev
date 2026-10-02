import { sql } from "drizzle-orm";
import { closeDb, db } from "./client";

/** Development helper: drops every table so `db:migrate` and `db:seed` start from scratch. */
async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to reset with NODE_ENV=production.");
  }
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  console.log("Database schema dropped.");
}

main()
  .catch((error: unknown) => {
    console.error("Reset failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
