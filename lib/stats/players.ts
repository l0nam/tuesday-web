import { and, asc, count, desc, eq, gt, gte, like, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcProfile, playerDay, playerStats } from "@/lib/db/schema";
import { PROFILE } from "@/lib/profile/config";
import { isOnline } from "@/lib/profile/stats";
import { addDays, dayKey } from "@/lib/utils/time";
import { PLAYERS_PER_PAGE, type Period, type PlayersQuery } from "@/lib/stats/filters";

export interface PlayerCardData {
  name: string;
  /** Наигранное время: за выбранный период, а для «Все» и «Онлайн» общее */
  seconds: number;
  online: boolean;
}

export interface PlayersPage {
  players: PlayerCardData[];
  total: number;
  page: number;
  pages: number;
}

/** Границы периода в днях сайта (включительно) или null, если период считается по общему времени. */
function dayRange(period: Period, today: string): { from: string; to: string } | null {
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case "week":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: addDays(today, -29), to: today };
    default:
      return null;
  }
}

/** Экранирует % и _ в строке для LIKE, чтобы поиск по нику не работал как шаблон. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listPlayers(query: PlayersQuery): Promise<PlayersPage> {
  const now = new Date();
  const range = dayRange(query.period, dayKey(now));

  // Время игрока: сумма по дням периода либо накопительный итог от плагина
  const seconds = range
    ? sql<string>`coalesce((select sum(${playerDay.seconds}) from ${playerDay} where ${playerDay.mcUuid} = ${playerStats.mcUuid} and ${playerDay.day} between ${range.from} and ${range.to}), 0)`
    : sql<string>`${playerStats.totalSeconds}`;

  const conditions: (SQL | undefined)[] = [
    query.q ? like(mcProfile.name, `%${escapeLike(query.q)}%`) : undefined,
    range ? gt(seconds, 0) : undefined,
    query.period === "online"
      ? and(eq(playerStats.online, true), gte(playerStats.lastSeenAt, new Date(now.getTime() - PROFILE.onlineWindowSeconds * 1000)))
      : undefined,
  ];
  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(playerStats)
    .innerJoin(mcProfile, eq(mcProfile.mcUuid, playerStats.mcUuid))
    .where(where);

  const pages = Math.max(1, Math.ceil(total / PLAYERS_PER_PAGE));
  const page = Math.min(query.page, pages);

  const order = {
    time_desc: [desc(seconds), asc(mcProfile.name)],
    time_asc: [asc(seconds), asc(mcProfile.name)],
    recent: [desc(playerStats.lastSeenAt), asc(mcProfile.name)],
    name: [asc(mcProfile.name)],
  }[query.sort];

  const rows = await db
    .select({ name: mcProfile.name, seconds, online: playerStats.online, lastSeenAt: playerStats.lastSeenAt })
    .from(playerStats)
    .innerJoin(mcProfile, eq(mcProfile.mcUuid, playerStats.mcUuid))
    .where(where)
    .orderBy(...order)
    .limit(PLAYERS_PER_PAGE)
    .offset((page - 1) * PLAYERS_PER_PAGE);

  return {
    players: rows.map((r) => ({ name: r.name, seconds: Number(r.seconds), online: isOnline(r, now) })),
    total,
    page,
    pages,
  };
}
