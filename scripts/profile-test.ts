/**
 * Проверка профиля на ЛОКАЛЬНОЙ БД: события плагина (онлайн, время по дням, город, донат),
 * загрузка профиля и роли из Discord (мок-сервер вместо настоящего Discord).
 *   npm run db:migrate && npm run test:profile
 *
 * Скрипт создаёт тестовые данные (user id вида proftest-*, тестовые UUID) и удаляет их по завершении.
 * Отказывается работать, если DATABASE_URL указывает не на localhost.
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import assert from "node:assert/strict";

// Окружение теста задаётся ДО первого обращения к getEnv()
process.env.SITE_TIMEZONE = "Europe/Moscow";
process.env.DISCORD_BOT_TOKEN = "test-bot-token";
process.env.DISCORD_GUILD_ID = "900000000000000001";
process.env.DISCORD_ROLE_ADMIN_ID = "800000000000000001";
process.env.DISCORD_ROLE_MODERATOR_ID = "800000000000000002";
process.env.DISCORD_ROLE_PLAYER_ID = "800000000000000003";

import { loadEnvConfig } from "@next/env";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  mcProfile,
  pendingReward,
  player,
  playerCity,
  playerDay,
  playerDiscord,
  playerDonate,
  playerStats,
  playtimeProgress,
  user,
  account,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { processBatch, processEvent } from "@/lib/plugin/plugin-events";
import { ensurePlayer } from "@/lib/player";
import {
  needsDiscordRefresh,
  refreshDiscordProfile,
  resetDiscordBudget,
  rolesFromDiscordIds,
  takeDiscordBudget,
  visibleRoles,
} from "@/lib/profile/discord";
import { findUuidByName, loadProfile } from "@/lib/profile/data";
import {
  recordPlaytime,
  recordPresence,
  setCityMembership,
  setDonate,
} from "@/lib/profile/record";

loadEnvConfig(process.cwd());

/* ----------------------------- тестовые данные ----------------------------- */

const U = {
  live: "a0000000000000000000000000000001", // онлайн-присутствие и живые события
  mid: "a0000000000000000000000000000002", // деление через полночь
  clamp: "a0000000000000000000000000000003", // защита от завышенного прироста
  vet: "a0000000000000000000000000000004", // готовая история дней: стрик/окна/карта
  race: "a0000000000000000000000000000005", // параллельные отчёты
  social: "a0000000000000000000000000000006", // город, донат, роли, баланс
  noacc: "a0000000000000000000000000000007", // игрок без аккаунта на сайте
  live2: "a0000000000000000000000000000008", // параллельные события playtime через processEvent
  dAdmin: "a0000000000000000000000000000009", // Discord: участник сервера с ролями
  dPlain: "a000000000000000000000000000000a", // Discord: участник без нужных ролей
  dGone: "a000000000000000000000000000000b", // Discord: вышел с сервера
  dLimited: "a000000000000000000000000000000c", // Discord: 429
  dBroken: "a000000000000000000000000000000d", // Discord: мусор в ответе
  dRace: "a000000000000000000000000000000e", // Discord: параллельные просмотры
  dBudget: "a000000000000000000000000000000f", // Discord: общий лимит обновлений
  // Игрок, который есть только в БД DiscordSRV (на сайт не входил): строка 100000000000000001 ↔ 069a79f4-... в локальной БД
  srv: "069a79f444e94726a5befca90e38aaf5",
};
const ALL_UUIDS = Object.values(U);

const D = {
  admin: "700000000000000001",
  plain: "700000000000000002",
  gone: "700000000000000003",
  limited: "700000000000000004",
  broken: "700000000000000005",
  race: "700000000000000006",
  social: "700000000000000007",
  budget: "700000000000000008",
  srv: "100000000000000001", // привязан к U.srv в локальной таблице discordsrv_accounts
};

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(
      `  ✗ ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`,
    );
  }
}
const group = (title: string) => console.log(`\n${title}`);

/* ------------------------------- мок Discord ------------------------------- */

const discordHits: string[] = [];
const ROLE = {
  admin: "800000000000000001",
  moderator: "800000000000000002",
  player: "800000000000000003",
};

function discordMock(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "";
  discordHits.push(url);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.headers.authorization !== "Bot test-bot-token")
    return send(401, { message: "401: Unauthorized" });

  const member = url.match(/^\/guilds\/900000000000000001\/members\/(\d+)$/);
  if (member) {
    switch (member[1]) {
      case D.admin:
        return send(200, {
          user: { id: D.admin, username: "adm_user" },
          roles: [ROLE.player, "555", ROLE.admin],
        });
      case D.plain:
        return send(200, {
          user: { id: D.plain, username: "plain_user" },
          roles: ["555", "556"],
        });
      case D.gone:
        return send(404, { code: 10007, message: "Unknown Member" });
      case D.limited:
        return send(429, {
          message: "You are being rate limited.",
          retry_after: 1,
        });
      case D.broken:
        return send(200, { unexpected: true });
      case D.race:
        return send(200, {
          user: { id: D.race, username: "race_user" },
          roles: [ROLE.moderator],
        });
      case D.budget:
        return send(200, {
          user: { id: D.budget, username: "budget_user" },
          roles: [ROLE.player],
        });
      case D.srv:
        return send(200, {
          user: { id: D.srv, username: "srv_user" },
          roles: [ROLE.moderator, "555"],
        });
      default:
        return send(404, { code: 10007, message: "Unknown Member" });
    }
  }
  const userMatch = url.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    return userMatch[1] === D.gone
      ? send(200, { id: D.gone, username: "gone_user" })
      : send(404, {});
  }
  return send(404, {});
}

/* -------------------------------- helpers -------------------------------- */

async function cleanup() {
  await db.delete(user).where(like(user.id, "proftest-%")); // каскадом: игроки
  for (const table of [
    playerStats,
    playerDay,
    playerDonate,
    playerCity,
    playerDiscord,
    mcProfile,
    playtimeProgress,
    pendingReward,
  ]) {
    await db.delete(table).where(inArray(table.mcUuid, ALL_UUIDS));
  }
}

async function createUser(
  id: string,
  discordId: string,
  mc?: { uuid: string; name: string },
) {
  await db.insert(user).values({ id, name: id, email: `${id}@test.local` });
  await db
    .insert(account)
    .values({
      id: `acc-${id}`,
      accountId: discordId,
      providerId: "discord",
      userId: id,
    });
  const p = await ensurePlayer(id);
  assert.ok(p, "ensurePlayer вернул null");
  if (mc) {
    await db
      .update(player)
      .set({ mcUuid: mc.uuid, mcName: mc.name })
      .where(eq(player.userId, id));
    await db
      .insert(mcProfile)
      .values({ mcUuid: mc.uuid, name: mc.name })
      .onDuplicateKeyUpdate({ set: { name: mc.name } });
  }
}

const statsOf = async (uuid: string) =>
  (await db.select().from(playerStats).where(eq(playerStats.mcUuid, uuid)))[0];
const daysOf = async (uuid: string) =>
  Object.fromEntries(
    (await db.select().from(playerDay).where(eq(playerDay.mcUuid, uuid))).map(
      (r) => [r.day, r.seconds],
    ),
  );

const NOW = new Date("2026-10-16T09:00:00Z"); // 12:00 МСК, пятница

/* ---------------------------------- main ---------------------------------- */

async function main() {
  const dbUrl = new URL(getEnv().DATABASE_URL);
  if (!["127.0.0.1", "localhost", "::1"].includes(dbUrl.hostname)) {
    console.error(
      `Отказ: DATABASE_URL указывает на ${dbUrl.hostname}. Тест удаляет данные и должен идти только на локальной БД.`,
    );
    process.exit(2);
  }

  const server = createServer(discordMock);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  // getEnv() кэшируется при первом вызове (выше), поэтому подменяем адрес прямо в его результате
  getEnv().DISCORD_API_BASE = `http://127.0.0.1:${port}`;

  await cleanup();

  try {
    /* ------------------------------ онлайн ------------------------------ */
    group("Онлайн и заходы (presence)");
    await test("вход создаёт запись, отмечает сегодняшний день как «заходил»", async () => {
      await recordPresence(U.live, true, NOW);
      const s = await statsOf(U.live);
      assert.equal(s.online, true);
      assert.equal(s.lastSeenAt?.getTime(), NOW.getTime());
      assert.deepEqual(await daysOf(U.live), { "2026-10-16": 0 });
    });
    await test("сердцебиение не дублирует день и не ломает запись; firstSeenAt не меняется", async () => {
      const later = new Date(NOW.getTime() + 5 * 60_000);
      await recordPresence(U.live, true, later);
      await recordPresence(U.live, true, later);
      const s = await statsOf(U.live);
      assert.equal(s.firstSeenAt.getTime(), NOW.getTime());
      assert.equal(s.lastSeenAt?.getTime(), later.getTime());
      assert.deepEqual(await daysOf(U.live), { "2026-10-16": 0 });
    });
    await test("выход ставит online=false и сохраняет историю дней", async () => {
      await recordPresence(
        U.live,
        false,
        new Date(NOW.getTime() + 20 * 60_000),
      );
      assert.equal((await statsOf(U.live)).online, false);
      assert.deepEqual(await daysOf(U.live), { "2026-10-16": 0 });
    });
    await test("через событие плагина (processEvent): онлайн-флаг, ник и невалидные данные", async () => {
      assert.deepEqual(
        await processEvent({
          type: "presence",
          uuid: U.live,
          name: "ProfLive",
          online: true,
        }),
        { status: "recorded" },
      );
      assert.equal((await statsOf(U.live)).online, true);
      assert.equal(
        (await findUuidByName("proflive"))?.uuid,
        U.live,
        "ник из события доступен для поиска без учёта регистра",
      );
      assert.equal(
        (await processEvent({ type: "presence", uuid: U.live, online: "yes" }))
          .status,
        "invalid",
      );
      assert.equal(
        (await processEvent({ type: "presence", uuid: "zzz", online: true }))
          .status,
        "invalid",
      );
    });

    /* --------------------------- игровое время --------------------------- */
    group("Игровое время по дням (playtime)");
    const T0 = new Date("2026-10-14T10:00:00Z");
    await test("первый отчёт задаёт только отправную точку (история до плагина по дням неизвестна)", async () => {
      await recordPlaytime(U.clamp, 5000, T0);
      const s = await statsOf(U.clamp);
      assert.equal(s.totalSeconds, 5000);
      assert.deepEqual(await daysOf(U.clamp), {});
    });
    await test("прирост больше прошедшего времени ограничивается им (в день попадает 60 с), общее время точное", async () => {
      await recordPlaytime(U.clamp, 10_000, new Date(T0.getTime() + 60_000));
      assert.equal((await statsOf(U.clamp)).totalSeconds, 10_000);
      assert.deepEqual(await daysOf(U.clamp), { "2026-10-14": 60 });
    });
    await test("запоздавший повтор старого значения игнорируется целиком", async () => {
      await recordPlaytime(U.clamp, 9_000, new Date(T0.getTime() + 120_000));
      const s = await statsOf(U.clamp);
      assert.equal(s.totalSeconds, 10_000);
      assert.equal(
        s.playtimeReportedAt?.getTime(),
        T0.getTime() + 60_000,
        "метка отчёта не должна сдвигаться",
      );
      assert.deepEqual(await daysOf(U.clamp), { "2026-10-14": 60 });
    });
    await test("нормальный отчёт каждые 5 минут копится в день", async () => {
      const t = (min: number) => new Date(T0.getTime() + min * 60_000);
      await recordPlaytime(U.clamp, 10_300, t(6)); // +300 с за 5 минут
      await recordPlaytime(U.clamp, 10_600, t(11));
      assert.deepEqual(await daysOf(U.clamp), { "2026-10-14": 660 });
      assert.equal((await statsOf(U.clamp)).totalSeconds, 10_600);
    });
    await test("прирост выше maxAttributedDeltaSeconds не раздувает день (потолок 12 ч)", async () => {
      // Прошли сутки без отчётов, а счётчик вырос на 20 часов: в день уйдёт не больше 12 часов
      await recordPlaytime(
        U.clamp,
        10_600 + 20 * 3600,
        new Date(T0.getTime() + 24 * 3600_000 + 11 * 60_000),
      );
      const days = await daysOf(U.clamp);
      const added = Object.values(days).reduce((a, b) => a + b, 0) - 660;
      assert.equal(added, 12 * 3600);
      assert.equal((await statsOf(U.clamp)).totalSeconds, 10_600 + 20 * 3600);
    });
    await test("полночь: время делится между двумя днями (23:50 → 00:10 МСК)", async () => {
      await recordPlaytime(U.mid, 1_000, new Date("2026-10-15T20:50:00Z"));
      await recordPlaytime(U.mid, 2_200, new Date("2026-10-15T21:10:00Z"));
      assert.deepEqual(await daysOf(U.mid), {
        "2026-10-16": 600,
        "2026-10-15": 600,
      });
    });
    await test("сутки не могут вместить больше 86400 секунд", async () => {
      await db
        .update(playerDay)
        .set({ seconds: 86_000 })
        .where(
          and(eq(playerDay.mcUuid, U.mid), eq(playerDay.day, "2026-10-16")),
        );
      await recordPlaytime(U.mid, 2_800, new Date("2026-10-15T21:20:00Z")); // +600 за 10 минут, в 00:20 МСК
      assert.equal((await daysOf(U.mid))["2026-10-16"], 86_400);
    });
    await test("через событие плагина: время записывается, награды работают как раньше", async () => {
      const r = await processEvent({
        type: "playtime",
        uuid: U.live,
        totalSeconds: 100 * 3600,
      });
      assert.ok(
        ["pending", "ignored", "credited"].includes(r.status),
        JSON.stringify(r),
      );
      assert.equal((await statsOf(U.live)).totalSeconds, 100 * 3600);
    });
    await test("20 параллельных событий playtime одного игрока: ни одного deadlock, награда начислена один раз", async () => {
      // Первое событие игрока только фиксирует отправную точку (grantExistingTime: false)
      await processEvent({
        type: "playtime",
        uuid: U.live2,
        totalSeconds: 3600 + 5,
      });
      const total = 7 * 3600 + 5;
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          processEvent({
            type: "playtime",
            uuid: U.live2,
            totalSeconds: total,
          }),
        ),
      );
      const bad = results.filter((r) => r.status === "invalid");
      assert.equal(bad.length, 0, JSON.stringify(bad[0]));
      assert.equal(
        results.filter((r) => r.status === "pending" || r.status === "credited")
          .length,
        1,
        JSON.stringify(results.map((r) => r.status)),
      );
      assert.equal((await statsOf(U.live2)).totalSeconds, total);
    });
    await test("20 параллельных отчётов одного игрока: без ошибок, итог = максимум", async () => {
      const base = Date.now();
      await recordPlaytime(U.race, 1_000, new Date(base));
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          recordPlaytime(
            U.race,
            1_000 + (i + 1) * 10,
            new Date(base + (i + 1) * 1000),
          ),
        ),
      );
      const s = await statsOf(U.race);
      assert.ok(
        s.totalSeconds >= 1_010 && s.totalSeconds <= 1_200,
        `total=${s.totalSeconds}`,
      );
      const days = Object.values(await daysOf(U.race)).reduce(
        (a, b) => a + b,
        0,
      );
      assert.ok(
        days <= s.totalSeconds - 1_000,
        "в дни не должно попасть больше, чем выросло общее время",
      );
    });

    /* ------------------------- город и донат ------------------------- */
    group("Город и донат");
    await test("город: запись, обновление, выход (null)", async () => {
      await setCityMembership(U.social, {
        id: "c1",
        name: "Солнечный",
        role: "member",
        members: 4,
      });
      assert.deepEqual(
        (
          await db
            .select()
            .from(playerCity)
            .where(eq(playerCity.mcUuid, U.social))
        ).map((r) => [r.cityId, r.cityName, r.role, r.members]),
        [["c1", "Солнечный", "member", 4]],
      );
      await setCityMembership(U.social, {
        id: "c2",
        name: "Закатный",
        members: 12,
      });
      const [row] = await db
        .select()
        .from(playerCity)
        .where(eq(playerCity.mcUuid, U.social));
      assert.deepEqual(
        [row.cityId, row.cityName, row.role, row.members],
        ["c2", "Закатный", null, 12],
      );
      await setCityMembership(U.social, null);
      assert.equal(
        (
          await db
            .select()
            .from(playerCity)
            .where(eq(playerCity.mcUuid, U.social))
        ).length,
        0,
      );
    });
    await test("city_membership через processEvent: валидация", async () => {
      const ok = await processEvent({
        type: "city_membership",
        uuid: U.social,
        city: { id: "c1", name: "Солнечный", role: "owner", members: 10 },
      });
      assert.deepEqual(ok, { status: "recorded" });
      assert.equal(
        (
          await processEvent({
            type: "city_membership",
            uuid: U.social,
            city: { id: "c1" },
          })
        ).status,
        "invalid",
        "нет названия города",
      );
      assert.equal(
        (await processEvent({ type: "city_membership", uuid: U.social }))
          .status,
        "invalid",
        "city обязателен (null = выход)",
      );
      assert.deepEqual(
        await processEvent({
          type: "city_membership",
          uuid: U.social,
          city: null,
        }),
        { status: "recorded" },
      );
      assert.equal(
        (
          await db
            .select()
            .from(playerCity)
            .where(eq(playerCity.mcUuid, U.social))
        ).length,
        0,
      );
    });
    await test("донат через processEvent: выдача, срок, снятие, ошибки", async () => {
      assert.deepEqual(
        await processEvent({
          type: "donate",
          uuid: U.social,
          tier: "veterok",
          expiresAt: "2030-01-01T00:00:00Z",
        }),
        { status: "recorded" },
      );
      const [row] = await db
        .select()
        .from(playerDonate)
        .where(eq(playerDonate.mcUuid, U.social));
      assert.equal(row.tier, "veterok");
      assert.equal(row.expiresAt?.toISOString(), "2030-01-01T00:00:00.000Z");

      assert.deepEqual(
        await processEvent({ type: "donate", uuid: U.social, tier: "veterok" }),
        { status: "recorded" },
      );
      assert.equal(
        (
          await db
            .select()
            .from(playerDonate)
            .where(eq(playerDonate.mcUuid, U.social))
        )[0].expiresAt,
        null,
        "без срока = бессрочно",
      );

      const unknown = await processEvent({
        type: "donate",
        uuid: U.social,
        tier: "no_such_tier",
      });
      assert.equal(unknown.status, "invalid");
      assert.equal(
        (
          await processEvent({
            type: "donate",
            uuid: U.social,
            tier: "veterok",
            expiresAt: "завтра",
          })
        ).status,
        "invalid",
      );
      assert.equal(
        (
          await db
            .select()
            .from(playerDonate)
            .where(eq(playerDonate.mcUuid, U.social))
        )[0].tier,
        "veterok",
        "битые события ничего не меняют",
      );

      assert.deepEqual(
        await processEvent({ type: "donate", uuid: U.social, tier: null }),
        { status: "recorded" },
      );
      assert.equal(
        (
          await db
            .select()
            .from(playerDonate)
            .where(eq(playerDonate.mcUuid, U.social))
        ).length,
        0,
      );
    });
    await test("пачка из разных событий: одно битое не мешает остальным", async () => {
      for (const t of [playerStats, playerDay, playerCity, playerDonate])
        await db.delete(t).where(eq(t.mcUuid, U.noacc));
      const results = await processBatch([
        { type: "presence", uuid: U.noacc, online: true },
        { type: "donate", uuid: U.noacc, tier: "nope" },
        {
          type: "city_membership",
          uuid: U.noacc,
          city: { id: "c9", name: "Тест" },
        },
      ]);
      assert.deepEqual(
        results.map((r) => r.status),
        ["recorded", "invalid", "recorded"],
      );
    });

    /* ------------------------------ роли ------------------------------ */
    group("Роли из Discord");
    await test("роли сайта по ID: фильтр лишних, порядок по старшинству", async () => {
      assert.deepEqual(rolesFromDiscordIds([ROLE.player, "555", ROLE.admin]), [
        "admin",
        "player",
      ]);
      assert.deepEqual(rolesFromDiscordIds(["555"]), []);
      assert.deepEqual(rolesFromDiscordIds([]), []);
    });
    await test("видимые бейджи: все подходящие, в порядке старшинства", async () => {
      assert.deepEqual(
        visibleRoles(["player", "admin"]).map((r) => r.label),
        ["Администратор", "Игрок"],
      );
      assert.deepEqual(
        visibleRoles(["неизвестная"]).map((r) => r.label),
        [],
      );
    });
    await test("needsDiscordRefresh: нет записи / не проверялось / свежая / устаревшая", async () => {
      assert.equal(needsDiscordRefresh(null, NOW), true);
      assert.equal(needsDiscordRefresh({ checkedAt: null }, NOW), true);
      assert.equal(
        needsDiscordRefresh(
          { checkedAt: new Date(NOW.getTime() - 60_000) },
          NOW,
        ),
        false,
      );
      assert.equal(
        needsDiscordRefresh(
          { checkedAt: new Date(NOW.getTime() - 11 * 60_000) },
          NOW,
        ),
        true,
      );
    });

    // Пользователи сайта: Discord ID берётся из аккаунта сайта, кэш лежит по UUID игрока
    await createUser("proftest-admin", D.admin, {
      uuid: U.dAdmin,
      name: "ProfAdmin",
    });
    await createUser("proftest-plain", D.plain, {
      uuid: U.dPlain,
      name: "ProfPlain",
    });
    await createUser("proftest-gone", D.gone, {
      uuid: U.dGone,
      name: "ProfGone",
    });
    await createUser("proftest-limited", D.limited, {
      uuid: U.dLimited,
      name: "ProfLimited",
    });
    await createUser("proftest-broken", D.broken, {
      uuid: U.dBroken,
      name: "ProfBroken",
    });
    await createUser("proftest-race", D.race, {
      uuid: U.dRace,
      name: "ProfRaceD",
    });
    await createUser("proftest-budget", D.budget, {
      uuid: U.dBudget,
      name: "ProfBudget",
    });
    const cacheOf = async (uuid: string) =>
      (
        await db
          .select()
          .from(playerDiscord)
          .where(eq(playerDiscord.mcUuid, uuid))
      )[0];
    resetDiscordBudget();

    await test("участник сервера: ник и роли сохраняются, лишние роли отбрасываются", async () => {
      assert.equal(await refreshDiscordProfile(U.dAdmin, NOW), "refreshed");
      const c = await cacheOf(U.dAdmin);
      assert.deepEqual(c.roles, ["admin", "player"]);
      assert.equal(c.username, "adm_user");
      assert.equal(c.discordId, D.admin);
    });
    await test("повторный запрос внутри окна кэша не ходит в Discord", async () => {
      const before = discordHits.length;
      assert.equal(
        await refreshDiscordProfile(U.dAdmin, new Date(NOW.getTime() + 60_000)),
        "fresh",
      );
      assert.equal(discordHits.length, before);
    });
    await test("после истечения кэша обновляется снова", async () => {
      const before = discordHits.length;
      assert.equal(
        await refreshDiscordProfile(
          U.dAdmin,
          new Date(NOW.getTime() + 11 * 60_000),
        ),
        "refreshed",
      );
      assert.equal(discordHits.length, before + 1);
    });
    await test("участник без нужных ролей: ролей нет, ник есть", async () => {
      assert.equal(await refreshDiscordProfile(U.dPlain, NOW), "refreshed");
      const c = await cacheOf(U.dPlain);
      assert.deepEqual(c.roles, []);
      assert.equal(c.username, "plain_user");
    });
    await test("не состоит на сервере (404): ролей нет, ник берётся из профиля пользователя Discord", async () => {
      assert.equal(await refreshDiscordProfile(U.dGone, NOW), "refreshed");
      const c = await cacheOf(U.dGone);
      assert.deepEqual(c.roles, []);
      assert.equal(c.username, "gone_user");
    });
    await test("вышел с сервера после получения ролей: роли снимаются", async () => {
      await db
        .update(playerDiscord)
        .set({
          roles: ["moderator"],
          checkedAt: new Date(NOW.getTime() - 3600_000),
        })
        .where(eq(playerDiscord.mcUuid, U.dGone));
      assert.equal(await refreshDiscordProfile(U.dGone, NOW), "refreshed");
      assert.deepEqual((await cacheOf(U.dGone)).roles, []);
    });
    await test("лимит запросов (429) и неожиданный ответ: error, старые данные сохраняются", async () => {
      await db
        .insert(playerDiscord)
        .values({
          mcUuid: U.dLimited,
          discordId: D.limited,
          username: "old_name",
          roles: ["moderator"],
          checkedAt: null,
        });
      assert.equal(await refreshDiscordProfile(U.dLimited, NOW), "error");
      let c = await cacheOf(U.dLimited);
      assert.deepEqual([c.roles, c.username], [["moderator"], "old_name"]);
      assert.ok(c.checkedAt, "после ошибки повтор откладывается на время кэша");
      assert.equal(
        await refreshDiscordProfile(
          U.dLimited,
          new Date(NOW.getTime() + 60_000),
        ),
        "fresh",
        "сразу после ошибки Discord не долбим",
      );

      assert.equal(await refreshDiscordProfile(U.dBroken, NOW), "error");
      c = await cacheOf(U.dBroken);
      assert.deepEqual([c.roles, c.username], [[], null]);
    });
    await test("10 параллельных просмотров устаревшего профиля = один запрос в Discord", async () => {
      const before = discordHits.length;
      const outcomes = await Promise.all(
        Array.from({ length: 10 }, () => refreshDiscordProfile(U.dRace, NOW)),
      );
      assert.equal(
        outcomes.filter((o) => o === "refreshed").length,
        1,
        outcomes.join(","),
      );
      assert.equal(outcomes.filter((o) => o === "fresh").length, 9);
      assert.equal(discordHits.length - before, 1);
      assert.deepEqual((await cacheOf(U.dRace)).roles, ["moderator"]);
    });
    await test("неверный токен бота: Discord ответил 401, роли не меняются", async () => {
      const env = getEnv();
      const saved = env.DISCORD_BOT_TOKEN;
      env.DISCORD_BOT_TOKEN = "wrong-token";
      try {
        await db
          .update(playerDiscord)
          .set({ checkedAt: null })
          .where(eq(playerDiscord.mcUuid, U.dAdmin));
        assert.equal(await refreshDiscordProfile(U.dAdmin, NOW), "error");
        assert.deepEqual((await cacheOf(U.dAdmin)).roles, ["admin", "player"]);
      } finally {
        env.DISCORD_BOT_TOKEN = saved;
      }
    });

    const hasSrv = Boolean(getEnv().DISCORDSRV_DATABASE_URL);
    if (!hasSrv)
      console.log(
        "  (пропущено: DISCORDSRV_DATABASE_URL не задан, проверки связки DiscordSRV не выполняются)",
      );
    else {
      await test("игрок без аккаунта на сайте: Discord ID берётся из связки DiscordSRV, роли подтягиваются", async () => {
        const before = discordHits.length;
        assert.equal(await refreshDiscordProfile(U.srv, NOW), "refreshed");
        const c = await cacheOf(U.srv);
        assert.deepEqual(c.roles, ["moderator"]);
        assert.equal(c.discordId, D.srv);
        assert.equal(c.username, "srv_user");
        assert.equal(discordHits.length - before, 1);
      });
      await test("игрок без связки нигде: пустая запись и ни одного запроса в Discord", async () => {
        await db.delete(playerDiscord).where(eq(playerDiscord.mcUuid, U.noacc));
        const before = discordHits.length;
        assert.equal(await refreshDiscordProfile(U.noacc, NOW), "refreshed");
        const c = await cacheOf(U.noacc);
        assert.deepEqual([c.discordId, c.username, c.roles], [null, null, []]);
        assert.equal(
          discordHits.length,
          before,
          "без Discord ID спрашивать Discord не о ком",
        );
      });
      await test("БД DiscordSRV недоступна: error, Discord не трогаем, старые роли остаются", async () => {
        const env = getEnv();
        const saved = env.DISCORDSRV_DATABASE_URL;
        await db
          .update(playerDiscord)
          .set({ checkedAt: null })
          .where(eq(playerDiscord.mcUuid, U.srv));
        env.DISCORDSRV_DATABASE_URL = undefined;
        try {
          const before = discordHits.length;
          assert.equal(await refreshDiscordProfile(U.srv, NOW), "error");
          assert.equal(discordHits.length, before);
          assert.deepEqual((await cacheOf(U.srv)).roles, ["moderator"]);
        } finally {
          env.DISCORDSRV_DATABASE_URL = saved;
        }
      });
    }

    await test("общий лимит обновлений: сверх лимита «throttled», запрос не уходит, занятие снимается", async () => {
      resetDiscordBudget();
      for (let i = 0; i < 30; i += 1)
        assert.equal(takeDiscordBudget(NOW.getTime()), true);
      assert.equal(
        takeDiscordBudget(NOW.getTime()),
        false,
        "31-й в ту же минуту отклоняется",
      );

      const before = discordHits.length;
      assert.equal(await refreshDiscordProfile(U.dBudget, NOW), "throttled");
      assert.equal(discordHits.length, before);
      assert.equal(
        (await cacheOf(U.dBudget)).checkedAt,
        null,
        "после отказа игрок остаётся «непроверенным», а не «свежим»",
      );

      // Минуту спустя бюджет восстановился
      assert.equal(
        await refreshDiscordProfile(
          U.dBudget,
          new Date(NOW.getTime() + 61_000),
        ),
        "refreshed",
      );
      assert.deepEqual((await cacheOf(U.dBudget)).roles, ["player"]);
      resetDiscordBudget();
    });
    await test("Discord не настроен: ничего не обновляется и страница не ждёт", async () => {
      const env = getEnv();
      const saved = env.DISCORD_BOT_TOKEN;
      env.DISCORD_BOT_TOKEN = undefined;
      try {
        const before = discordHits.length;
        assert.equal(
          await refreshDiscordProfile(
            U.dPlain,
            new Date(NOW.getTime() + 3600_000),
          ),
          "disabled",
        );
        assert.equal(needsDiscordRefresh(null, NOW), false);
        assert.equal(discordHits.length, before);
        const p = (await loadProfile("ProfPlain", null, NOW))!;
        assert.equal(p.discordRefreshNeeded, false);
        assert.equal(p.discordNeverChecked, false);
      } finally {
        env.DISCORD_BOT_TOKEN = saved;
      }
    });

    /* --------------------------- загрузка профиля --------------------------- */
    group("Загрузка профиля (loadProfile)");

    // Игрок «vet»: история дней из заранее известных строк
    await createUser("proftest-social", D.social, {
      uuid: U.vet,
      name: "ProfVet",
    });
    await db
      .insert(playerStats)
      .values({
        mcUuid: U.vet,
        totalSeconds: 2029 * 3600 + 3240,
        online: true,
        firstSeenAt: new Date("2026-01-01T00:00:00Z"),
        lastSeenAt: new Date(NOW.getTime() - 60_000),
      });
    await db.insert(playerDay).values([
      { mcUuid: U.vet, day: "2026-10-16", seconds: 3600 },
      { mcUuid: U.vet, day: "2026-10-15", seconds: 7200 },
      { mcUuid: U.vet, day: "2026-10-14", seconds: 600 },
      { mcUuid: U.vet, day: "2026-10-10", seconds: 100 },
      { mcUuid: U.vet, day: "2026-09-20", seconds: 900 },
      { mcUuid: U.vet, day: "2026-05-01", seconds: 1800 },
    ]);
    await db
      .update(player)
      .set({ bio: "Привет! **Люблю** строить.", balance: 1250 })
      .where(eq(player.userId, "proftest-social"));
    await db
      .insert(playerDiscord)
      .values({
        mcUuid: U.vet,
        discordId: D.social,
        username: "vet_user",
        roles: ["admin", "player"],
        checkedAt: NOW,
      });

    await test("поиск по нику без учёта регистра; неизвестные и опасные имена не находятся", async () => {
      assert.equal((await loadProfile("profvet", null, NOW))?.name, "ProfVet");
      assert.equal((await loadProfile("PROFVET", null, NOW))?.uuid, U.vet);
      assert.equal(await loadProfile("NobodyHere", null, NOW), null);
      assert.equal(await loadProfile("' OR 1=1 --", null, NOW), null);
      assert.equal(await loadProfile("../etc/passwd", null, NOW), null);
      assert.equal(await loadProfile("", null, NOW), null);
    });
    await test("статистика: всего, месяц, неделя, сегодня, стрик, активные дни", async () => {
      const p = (await loadProfile("ProfVet", null, NOW))!;
      assert.equal(p.stats.totalSeconds, 2029 * 3600 + 3240);
      assert.equal(p.stats.todaySeconds, 3600);
      assert.equal(p.stats.weekSeconds, 3600 + 7200 + 600 + 100); // 10..16 октября
      assert.equal(p.stats.monthSeconds, 3600 + 7200 + 600 + 100 + 900); // с 17 сентября
      assert.deepEqual(p.stats.streak, { current: 3, best: 3 });
      assert.equal(p.stats.activeDays, 6);
    });
    await test("тепловая карта: 26 колонок × 7, значения попали в свои клетки", async () => {
      const p = (await loadProfile("ProfVet", null, NOW))!;
      assert.equal(p.stats.heatmap.length, 26);
      const cells = p.stats.heatmap.flat();
      assert.equal(cells.find((c) => c.day === "2026-10-15")?.level, 2); // 2 часа
      assert.equal(cells.find((c) => c.day === "2026-05-01")?.level, 1);
      assert.equal(cells.find((c) => c.day === "2026-10-13")?.level, 0);
    });
    await test("онлайн: свежий сигнал = онлайн; просроченный = офлайн (сервер мог упасть)", async () => {
      assert.equal((await loadProfile("ProfVet", null, NOW))!.online, true);
      assert.equal(
        (await loadProfile(
          "ProfVet",
          null,
          new Date(NOW.getTime() + 30 * 60_000),
        ))!.online,
        false,
      );
    });
    await test("роли, Discord-ник, описание, баланс; смотрящий не владелец", async () => {
      const p = (await loadProfile("ProfVet", null, NOW))!;
      assert.deepEqual(
        p.roles.map((r) => r.label),
        ["Администратор", "Игрок"],
      );
      assert.equal(p.discordUsername, "vet_user");
      assert.equal(p.bio, "Привет! **Люблю** строить.");
      assert.equal(p.balance, 1250);
      assert.equal(p.hasAccount, true);
      assert.equal(p.isSelf, false);
      assert.equal(p.discordRefreshNeeded, false, "кэш Discord свежий");
      assert.equal(p.discordNeverChecked, false);
    });
    await test("владелец распознаётся по сессии", async () => {
      assert.equal(
        (await loadProfile("ProfVet", "proftest-social", NOW))!.isSelf,
        true,
      );
      assert.equal(
        (await loadProfile("ProfVet", "proftest-admin", NOW))!.isSelf,
        false,
      );
    });
    await test("игрок скрыл Discord-ник: ник пропадает, роли остаются", async () => {
      await db
        .update(player)
        .set({ showDiscord: false })
        .where(eq(player.userId, "proftest-social"));
      const p = (await loadProfile("ProfVet", null, NOW))!;
      assert.equal(p.discordUsername, null);
      assert.equal(p.roles.length, 2);
      await db
        .update(player)
        .set({ showDiscord: true })
        .where(eq(player.userId, "proftest-social"));
    });
    await test("устаревший кэш Discord: профиль просит обновление, но показывает прежние роли; пустое описание = null", async () => {
      await db
        .update(playerDiscord)
        .set({ checkedAt: new Date(NOW.getTime() - 3600_000) })
        .where(eq(playerDiscord.mcUuid, U.vet));
      await db
        .update(player)
        .set({ bio: "   " })
        .where(eq(player.userId, "proftest-social"));
      const p = (await loadProfile("ProfVet", null, NOW))!;
      assert.equal(p.discordRefreshNeeded, true);
      assert.equal(
        p.discordNeverChecked,
        false,
        "данные есть, страница не ждёт обновления",
      );
      assert.equal(p.roles.length, 2);
      assert.equal(p.bio, null);
    });
    await test("город и донат: активный, бессрочный, истёкший, неизвестный тариф", async () => {
      await setCityMembership(U.vet, {
        id: "c1",
        name: "Солнечный",
        role: "owner",
        members: 12,
      });
      await setDonate(U.vet, "veterok", new Date("2026-12-01T00:00:00Z"));
      let p = (await loadProfile("ProfVet", null, NOW))!;
      assert.deepEqual(p.city, {
        id: "c1",
        name: "Солнечный",
        role: "owner",
        members: 12,
      });
      assert.deepEqual(p.donate, {
        tier: "veterok",
        name: "Ветерок",
        expiresAt: new Date("2026-12-01T00:00:00Z"),
      });

      await setDonate(U.vet, "veterok", null);
      assert.equal(
        (await loadProfile("ProfVet", null, NOW))!.donate?.expiresAt,
        null,
      );

      await setDonate(U.vet, "veterok", new Date("2026-10-01T00:00:00Z"));
      assert.equal(
        (await loadProfile("ProfVet", null, NOW))!.donate,
        null,
        "истёкший = «Не куплен»",
      );

      await setDonate(U.vet, null, null);
      p = (await loadProfile("ProfVet", null, NOW))!;
      assert.equal(p.donate, null, "tier = null снимает статус");
      await db
        .insert(playerDonate)
        .values({ mcUuid: U.vet, tier: "legacy_tier", expiresAt: null })
        .onDuplicateKeyUpdate({ set: { tier: "legacy_tier" } });
      assert.equal(
        (await loadProfile("ProfVet", null, NOW))!.donate?.name,
        "legacy_tier",
        "тариф убрали из конфига: показываем ключ, не падаем",
      );

      await setCityMembership(U.vet, null);
      assert.equal((await loadProfile("ProfVet", null, NOW))!.city, null);
    });
    await test("игрок без аккаунта на сайте: профиль есть, баланса нет; Discord ещё не проверялся", async () => {
      for (const t of [
        playerStats,
        playerDay,
        playerCity,
        playerDonate,
        playerDiscord,
      ])
        await db.delete(t).where(eq(t.mcUuid, U.noacc));
      await db
        .insert(mcProfile)
        .values({ mcUuid: U.noacc, name: "ProfNoAcc" })
        .onDuplicateKeyUpdate({ set: { name: "ProfNoAcc" } });
      const p = (await loadProfile("ProfNoAcc", null, NOW))!;
      assert.equal(p.hasAccount, false);
      assert.equal(p.balance, null);
      assert.deepEqual(p.roles, []);
      assert.equal(p.discordUsername, null);
      assert.equal(
        p.discordRefreshNeeded,
        true,
        "роли по связке DiscordSRV ещё не искали",
      );
      assert.equal(p.discordNeverChecked, true);
      assert.equal(p.stats.totalSeconds, 0);
      assert.deepEqual(p.stats.streak, { current: 0, best: 0 });
    });
    await test("игрок только со связкой DiscordSRV: роли видны, Discord-ник скрыт (его не просили показывать)", async () => {
      await db
        .insert(mcProfile)
        .values({ mcUuid: U.srv, name: "ProfSrv" })
        .onDuplicateKeyUpdate({ set: { name: "ProfSrv" } });
      await db.delete(playerDiscord).where(eq(playerDiscord.mcUuid, U.srv));
      await db
        .insert(playerDiscord)
        .values({
          mcUuid: U.srv,
          discordId: D.srv,
          username: "srv_user",
          roles: ["moderator"],
          checkedAt: NOW,
        });
      const p = (await loadProfile("ProfSrv", null, NOW))!;
      assert.deepEqual(
        p.roles.map((r) => r.label),
        ["Модератор"],
      );
      assert.equal(p.discordUsername, null);
      assert.equal(p.hasAccount, false);
      assert.equal(p.discordRefreshNeeded, false);
    });
    await test("игрок проверен, но Discord не привязан: ждать обновления не нужно", async () => {
      await db.delete(playerDiscord).where(eq(playerDiscord.mcUuid, U.noacc));
      await db
        .insert(playerDiscord)
        .values({
          mcUuid: U.noacc,
          discordId: null,
          username: null,
          roles: [],
          checkedAt: NOW,
        });
      const p = (await loadProfile("ProfNoAcc", null, NOW))!;
      assert.equal(p.discordNeverChecked, false);
      assert.equal(p.discordRefreshNeeded, false);
      assert.deepEqual(p.roles, []);
    });
    await test("ник сменил владельца: профиль принадлежит тому, чья запись новее", async () => {
      await db
        .insert(mcProfile)
        .values({ mcUuid: U.race, name: "ProfVet" })
        .onDuplicateKeyUpdate({
          set: { name: "ProfVet", updatedAt: new Date(Date.now() + 5000) },
        });
      assert.equal((await loadProfile("ProfVet", null, NOW))!.uuid, U.race);
      await db
        .update(mcProfile)
        .set({ name: "ProfRace" })
        .where(eq(mcProfile.mcUuid, U.race));
      assert.equal((await loadProfile("ProfVet", null, NOW))!.uuid, U.vet);
    });
  } finally {
    await cleanup();
    server.close();
  }

  console.log(`\nИтого: ${passed} успешно, ${failed} с ошибками`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
  } catch {}
  process.exit(1);
});
