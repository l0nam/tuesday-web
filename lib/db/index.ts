import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import { getEnv, sslOption } from "@/lib/env";
import * as schema from "./schema";

export type Db = MySql2Database<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Один пул на процесс (в dev переживает hot reload, на Vercel живёт в пределах инстанса)
const g = globalThis as unknown as { __tuesdayPool?: Pool; __tuesdayDb?: Db };

export function getDb(): Db {
  if (g.__tuesdayDb) return g.__tuesdayDb;

  const env = getEnv();
  const pool = createPool({
    uri: env.DATABASE_URL,
    // Панельные хостинги часто ограничивают число подключений на пользователя, поэтому пул маленький
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

/** Ленивый `db`: подключение создаётся при первом запросе, а не при импорте модуля. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/**
 * Все транзакции приложения выполняются на READ COMMITTED.
 *
 * Почему не уровень по умолчанию (REPEATABLE READ): там снимок данных фиксируется на первом обычном
 * SELECT. Транзакция, дождавшаяся блокировки строки игрока (FOR UPDATE), не видела бы записи,
 * закоммиченные соседней транзакцией за время ожидания (например, ключ идемпотентности в ledger).
 * READ COMMITTED видит свежие данные в каждом запросе и не ставит gap-блокировки.
 *
 * Если MariaDB работает с binlog_format=STATEMENT, она откажет в этом режиме (ошибка 1665).
 * Тогда нужен binlog_format=MIXED или ROW (на MariaDB 10.2+ по умолчанию MIXED).
 */
export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(fn, { isolationLevel: "read committed" });
}

export { schema };
