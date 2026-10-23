import type { RowDataPacket } from "mysql2";
import { createPool, type Pool } from "mysql2/promise";
import { getEnv, sslOption } from "@/lib/env";
import { normalizeUuid } from "./utils/formatting";

const g = globalThis as unknown as { __discordsrvPool?: Pool };

function getPool(): Pool | null {
  const env = getEnv();
  if (!env.DISCORDSRV_DATABASE_URL) return null;
  if (!g.__discordsrvPool) {
    g.__discordsrvPool = createPool({
      uri: env.DISCORDSRV_DATABASE_URL,
      connectionLimit: 2,
      maxIdle: 1,
      idleTimeout: 30_000,
      connectTimeout: 5_000,
      enableKeepAlive: true,
      charset: "utf8mb4_unicode_ci",
      ssl: sslOption(env.DISCORDSRV_DATABASE_SSL ?? env.DATABASE_SSL),
    });
  }
  return g.__discordsrvPool;
}

export type LinkLookup =
  | { state: "linked"; mcUuid: string }
  | { state: "not_linked" }
  | { state: "unavailable"; reason: string };

export async function lookupLinkedAccount(
  discordId: string,
): Promise<LinkLookup> {
  const pool = getPool();
  if (!pool)
    return { state: "unavailable", reason: "DISCORDSRV_DATABASE_URL не задан" };

  const env = getEnv();
  const sql = `SELECT \`${env.DISCORDSRV_UUID_COLUMN}\` AS uuid FROM \`${env.DISCORDSRV_TABLE}\` WHERE \`${env.DISCORDSRV_DISCORD_COLUMN}\` = ? LIMIT 1`;

  try {
    const [rows] = await pool.query<RowDataPacket[]>({
      sql,
      values: [discordId],
      timeout: 5_000,
    });
    const raw = rows[0]?.uuid;
    if (raw == null) return { state: "not_linked" };

    const mcUuid = normalizeUuid(String(raw));
    if (!mcUuid) {
      console.error(
        `[discordsrv] в таблице ${env.DISCORDSRV_TABLE} значение UUID не похоже на UUID: ${String(raw)}`,
      );
      return {
        state: "unavailable",
        reason: "некорректный UUID в таблице DiscordSRV",
      };
    }
    return { state: "linked", mcUuid };
  } catch (error) {
    console.error("[discordsrv] ошибка запроса к БД DiscordSRV:", error);
    return { state: "unavailable", reason: "БД DiscordSRV недоступна" };
  }
}

export type DiscordLookup =
  | { state: "linked"; discordId: string }
  | { state: "not_linked" }
  | { state: "unavailable"; reason: string };

export async function lookupDiscordIdByUuid(
  mcUuid: string,
): Promise<DiscordLookup> {
  const pool = getPool();
  if (!pool)
    return { state: "unavailable", reason: "DISCORDSRV_DATABASE_URL не задан" };

  const env = getEnv();
  const sql = `SELECT \`${env.DISCORDSRV_DISCORD_COLUMN}\` AS discord FROM \`${env.DISCORDSRV_TABLE}\` WHERE LOWER(REPLACE(\`${env.DISCORDSRV_UUID_COLUMN}\`, '-', '')) = ? LIMIT 1`;

  try {
    const [rows] = await pool.query<RowDataPacket[]>({
      sql,
      values: [mcUuid.toLowerCase()],
      timeout: 5_000,
    });
    const raw = rows[0]?.discord;
    if (raw == null) return { state: "not_linked" };
    const discordId = String(raw);
    if (!/^\d{1,32}$/.test(discordId))
      return {
        state: "unavailable",
        reason: "некорректный Discord ID в таблице DiscordSRV",
      };
    return { state: "linked", discordId };
  } catch (error) {
    console.error("[discordsrv] ошибка запроса к БД DiscordSRV:", error);
    return { state: "unavailable", reason: "БД DiscordSRV недоступна" };
  }
}
