import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type GlobalWithDb = typeof globalThis & { __mobitedSql?: postgres.Sql; __mobitedDb?: Database };

function createClient(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure PostgreSQL.");
  }
  // prepare: false keeps the client compatible with transaction-mode poolers (Neon, Supabase).
  return postgres(url, {
    max: process.env.VERCEL ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
}

function getDb(): Database {
  const g = globalThis as GlobalWithDb;
  if (!g.__mobitedDb) {
    g.__mobitedSql = createClient();
    g.__mobitedDb = drizzle(g.__mobitedSql, { schema, casing: "snake_case" });
  }
  return g.__mobitedDb;
}

/** Lazily connected so builds and imports do not require DATABASE_URL. */
export const db: Database = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function closeDb(): Promise<void> {
  const g = globalThis as GlobalWithDb;
  if (g.__mobitedSql) {
    await g.__mobitedSql.end({ timeout: 5 });
    g.__mobitedSql = undefined;
    g.__mobitedDb = undefined;
  }
}

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Transaction;
export { schema };
