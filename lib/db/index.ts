import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import { getEnv, sslOption } from "@/lib/env";
import * as schema from "./schema";

export type Db = MySql2Database<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const g = globalThis as unknown as { __tuesdayPool?: Pool; __tuesdayDb?: Db };

export function getDb(): Db {
  if (g.__tuesdayDb) return g.__tuesdayDb;

  const env = getEnv();
  const pool = createPool({
    uri: env.DATABASE_URL,
    connectionLimit: 4,
    maxIdle: 2,
    idleTimeout: 60_000,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    charset: "utf8mb4_unicode_ci",
    timezone: "Z",
    ssl: sslOption(env.DATABASE_SSL),
  });

  g.__tuesdayPool = pool;
  g.__tuesdayDb = drizzle(pool, { schema, mode: "default" });
  return g.__tuesdayDb;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(fn, { isolationLevel: "read committed" });
}

export { schema };
