import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { player, playerDiscord } from "@/lib/db/schema";
import { lookupDiscordIdByUuid } from "@/lib/discordsrv";
import { getEnv } from "@/lib/env";
import { PROFILE, ROLE_BADGES, type RoleKey } from "@/lib/profile/config";
import { affectedRows } from "@/lib/economy/wallet";

/**
 * Роли и Discord-ник игрока для профиля. Источник: Discord API по токену бота
 * (бот должен состоять на сервере; привилегированные интенты для этого не нужны).
 * Сайт показывает только роли из ROLE_BADGES, остальные роли сервера игнорируются.
 *
 * Discord ID игрока берётся из аккаунта сайта, а если игрок на сайт не входил, из связки DiscordSRV.
 * Результат кэшируется в таблице player_discord (по UUID) на PROFILE.discordCacheSeconds.
 */

export function discordConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.DISCORD_BOT_TOKEN && env.DISCORD_GUILD_ID);
}

/** Роли сайта по списку ID ролей из Discord. Порядок результата = порядок ROLE_BADGES (по старшинству). */
export function rolesFromDiscordIds(roleIds: readonly string[]): RoleKey[] {
  const env = getEnv();
  const owned = new Set(roleIds);
  const result: RoleKey[] = [];
  for (const badge of ROLE_BADGES) {
    const id = env[badge.envKey];
    if (id && owned.has(id)) result.push(badge.key);
  }
  return result;
}

/** Какие бейджи показать рядом с ником (PROFILE.rolesMode: все подходящие или только старшая). */
export function visibleRoles(keys: readonly string[]): (typeof ROLE_BADGES)[number][] {
  const matched = ROLE_BADGES.filter((badge) => keys.includes(badge.key));
  return PROFILE.rolesMode === "highest" ? matched.slice(0, 1) : [...matched];
}

const memberSchema = z.object({
  user: z.object({ username: z.string().min(1).max(64) }),
  roles: z.array(z.string()),
});
const userSchema = z.object({ username: z.string().min(1).max(64) });

export type MemberLookup =
  | { state: "member"; username: string; roleIds: string[] }
  | { state: "not_member"; username: string | null }
  | { state: "error" };

async function discordGet(path: string): Promise<Response> {
  const env = getEnv();
  return fetch(`${env.DISCORD_API_BASE}${path}`, {
    headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    signal: AbortSignal.timeout(4_000),
    cache: "no-store",
  });
}

/** Запрашивает участника сервера. 404 = не состоит на сервере (ролей нет). Любая другая ошибка = error. */
export async function fetchGuildMember(discordId: string): Promise<MemberLookup> {
  if (!/^\d{1,32}$/.test(discordId)) return { state: "error" };
  const guild = getEnv().DISCORD_GUILD_ID;
  try {
    const res = await discordGet(`/guilds/${guild}/members/${discordId}`);
    if (res.ok) {
      const parsed = memberSchema.safeParse(await res.json());
      if (!parsed.success) return { state: "error" };
      return { state: "member", username: parsed.data.user.username, roleIds: parsed.data.roles };
    }
    if (res.status === 404) {
      // Не на сервере: ролей нет, но Discord-ник всё равно можно узнать
      const userRes = await discordGet(`/users/${discordId}`);
      const parsed = userRes.ok ? userSchema.safeParse(await userRes.json()) : null;
      return { state: "not_member", username: parsed?.success ? parsed.data.username : null };
    }
    if (res.status === 429) console.warn("[discord] лимит запросов, обновление ролей отложено");
    else console.error(`[discord] неожиданный ответ ${res.status} (проверьте токен бота и DISCORD_GUILD_ID)`);
    return { state: "error" };
  } catch (error) {
    console.error("[discord] не удалось обратиться к Discord:", error);
    return { state: "error" };
  }
}

/** Пора ли обновить кэш Discord для игрока (чистая функция: для страницы профиля и тестов). */
export function needsDiscordRefresh(cached: { checkedAt: Date | null } | null | undefined, now: Date = new Date()): boolean {
  if (!discordConfigured()) return false;
  if (!cached?.checkedAt) return true;
  return now.getTime() - cached.checkedAt.getTime() >= PROFILE.discordCacheSeconds * 1000;
}

/* ------------------------- общий лимит обновлений ------------------------- */

const g = globalThis as unknown as { __discordRefreshLog?: number[] };

/**
 * Сколько обновлений в минуту допустимо на весь сайт. Без этого обход всех профилей подряд засыпал бы
 * Discord запросами и привёл бы к блокировке бота по лимитам.
 */
export function takeDiscordBudget(now: number = Date.now()): boolean {
  const log = (g.__discordRefreshLog ??= []);
  while (log.length && now - log[0] >= 60_000) log.shift();
  if (log.length >= PROFILE.discordMaxRefreshesPerMinute) return false;
  log.push(now);
  return true;
}

/** Только для тестов */
export function resetDiscordBudget() {
  g.__discordRefreshLog = [];
}

export type RefreshOutcome = "refreshed" | "fresh" | "disabled" | "throttled" | "error";

/**
 * Обновляет Discord-ник и роли игрока по его UUID. Обновление «занимается» атомарным UPDATE по времени проверки,
 * поэтому при параллельных просмотрах профиля в Discord уходит один запрос; при ошибке старые данные остаются,
 * а следующая попытка будет через время кэша (защита от лимитов Discord).
 */
export async function refreshDiscordProfile(mcUuid: string, now: Date = new Date()): Promise<RefreshOutcome> {
  if (!discordConfigured()) return "disabled";

  const staleBefore = new Date(now.getTime() - PROFILE.discordCacheSeconds * 1000);

  // Строка кэша создаётся заранее, чтобы «занять» обновление одним UPDATE (ON DUPLICATE, а не INSERT IGNORE: без взаимных блокировок)
  await db
    .insert(playerDiscord)
    .values({ mcUuid, roles: [] })
    .onDuplicateKeyUpdate({ set: { mcUuid: sql`${playerDiscord.mcUuid}` } });

  const [before] = await db.select({ checkedAt: playerDiscord.checkedAt }).from(playerDiscord).where(eq(playerDiscord.mcUuid, mcUuid)).limit(1);

  const claim = await db
    .update(playerDiscord)
    .set({ checkedAt: now })
    .where(and(eq(playerDiscord.mcUuid, mcUuid), or(isNull(playerDiscord.checkedAt), lt(playerDiscord.checkedAt, staleBefore))));
  if (affectedRows(claim) === 0) return "fresh";

  // Общий лимит проверяем только тому, кто «занял» обновление: параллельные просмотры одного профиля бюджет не тратят.
  // Если бюджет исчерпан, занятие снимается, и следующий просмотр попробует снова.
  if (!takeDiscordBudget(now.getTime())) {
    await db
      .update(playerDiscord)
      .set({ checkedAt: before?.checkedAt ?? null })
      .where(and(eq(playerDiscord.mcUuid, mcUuid), eq(playerDiscord.checkedAt, now)));
    return "throttled";
  }

  // Discord ID: из аккаунта сайта, иначе из связки DiscordSRV
  const [site] = await db.select({ discordId: player.discordId }).from(player).where(eq(player.mcUuid, mcUuid)).limit(1);
  let discordId: string | null = site?.discordId ?? null;
  if (!discordId) {
    const linked = await lookupDiscordIdByUuid(mcUuid);
    if (linked.state === "unavailable") return "error";
    discordId = linked.state === "linked" ? linked.discordId : null;
  }

  if (!discordId) {
    await db.update(playerDiscord).set({ discordId: null, username: null, roles: [] }).where(eq(playerDiscord.mcUuid, mcUuid));
    return "refreshed";
  }

  const found = await fetchGuildMember(discordId);
  if (found.state === "error") return "error";

  await db
    .update(playerDiscord)
    .set({
      discordId,
      username: found.username,
      roles: found.state === "member" ? rolesFromDiscordIds(found.roleIds) : [],
    })
    .where(eq(playerDiscord.mcUuid, mcUuid));
  return "refreshed";
}
