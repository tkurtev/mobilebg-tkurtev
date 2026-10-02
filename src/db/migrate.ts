import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db } from "./client";

async function main() {
  const startedAt = Date.now();
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  console.log(`Migrations applied in ${Date.now() - startedAt} ms`);
}

main()
  .catch((error: unknown) => {
    console.error("Migration failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
