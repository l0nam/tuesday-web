/**
 * Сквозная проверка бэкенда на ЛОКАЛЬНОЙ БД из docker-compose.yml:
 *   npm run db:migrate && npm run test:smoke
 *
 * Скрипт создаёт тестовых пользователей (id вида smoketest-*) и удаляет их по завершении.
 * Он отказывается работать, если DATABASE_URL указывает не на localhost.
 *
 * Необязательно: TEST_DISCORDSRV_ADMIN_URL=mysql://root:root_pass@127.0.0.1:3306/discordsrv
 * включает проверку привязки/отвязки (скрипт временно меняет тестовые строки в таблице DiscordSRV).
 */
import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { and, eq, inArray, like } from "drizzle-orm";
import { createConnection } from "mysql2/promise";
import { POST as eventsPost } from "@/app/api/plugin/events/route";
import { GET as ordersGet } from "@/app/api/plugin/orders/route";
import { POST as orderCompletePost } from "@/app/api/plugin/orders/[id]/route";
import { db, withTransaction } from "@/lib/db";
import {
  account,
  ledger,
  mcProfile,
  pendingReward,
  player,
  playerDay,
  playerStats,
  playtimeProgress,
  shopItem,
  shopOrder,
  user,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { signPluginRequest, verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { processEvent, type EventResult } from "@/lib/plugin/plugin-events";
import { ensurePlayer, getPlayer, syncLink } from "@/lib/player";
import { REWARDS } from "@/lib/economy/rewards/config";
import { ShopError, claimOrders, completeOrder, purchaseItem } from "@/lib/economy/shop";
import { formatUuid } from "@/lib/minecraft/uuid";
import { credit, debit } from "@/lib/economy/wallet";

loadEnvConfig(process.cwd());

// Эти строки лежат в docker/mariadb/init/01-init.sql
const DISCORD_A = "100000000000000001";
const UUID_A = "069a79f444e94726a5befca90e38aaf5";
const DISCORD_B = "100000000000000002";
const UUID_B = "853c80ef3c3749fdaa49938b674adae6";
const DISCORD_C = "100000000000000099"; // в DiscordSRV его нет

const A = "smoketest-a";
const B = "smoketest-b";
const C = "smoketest-c";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`);
  }
}

function group(title: string) {
  console.log(`\n${title}`);
}

/* ------------------------------ helpers ------------------------------ */

async function cleanup() {
  await db.delete(user).where(like(user.id, "smoketest-%")); // каскадом: игроки, ledger, заказы
  await db.delete(pendingReward).where(inArray(pendingReward.mcUuid, [UUID_A, UUID_B]));
  await db.delete(playtimeProgress).where(inArray(playtimeProgress.mcUuid, [UUID_A, UUID_B]));
  await db.delete(mcProfile).where(inArray(mcProfile.mcUuid, [UUID_A, UUID_B]));
  await db.delete(playerStats).where(inArray(playerStats.mcUuid, [UUID_A, UUID_B]));
  await db.delete(playerDay).where(inArray(playerDay.mcUuid, [UUID_A, UUID_B]));
  await db.delete(shopItem).where(like(shopItem.slug, "smoketest-%"));
}

async function createUser(id: string, discordId: string) {
  await db.insert(user).values({ id, name: id, email: `${id}@test.local` });
  await db.insert(account).values({ id: `acc-${id}`, accountId: discordId, providerId: "discord", userId: id });
  const p = await ensurePlayer(id);
  assert.ok(p, "ensurePlayer вернул null");
}

async function balanceOf(userId: string) {
  const p = await getPlayer(userId);
  assert.ok(p);
  return p.balance;
}

let adjustSeq = 0;
async function setBalance(userId: string, target: number) {
  await withTransaction(async (tx) => {
    const current = await balanceOf(userId);
    const key = `smoketest-adjust-${Date.now()}-${adjustSeq++}`;
    if (target > current) await credit(tx, { userId, amount: target - current, type: "admin", idempotencyKey: key });
    if (target < current) await debit(tx, { userId, amount: current - target, type: "admin", idempotencyKey: key });
  });
  assert.equal(await balanceOf(userId), target);
}

async function assertLedgerConsistent(userId: string) {
  const rows = await db.select().from(ledger).where(eq(ledger.userId, userId)).orderBy(ledger.id);
  let running = 0;
  for (const row of rows) {
    running += row.amount;
    assert.equal(row.balanceAfter, running, `ledger #${row.id}: balanceAfter расходится с суммой операций`);
  }
  assert.equal(await balanceOf(userId), running, "баланс не равен сумме операций ledger");
}

function expectCredited(r: EventResult, amount: number) {
  assert.equal(r.status, "credited", JSON.stringify(r));
  if (r.status === "credited") assert.equal(r.amount, amount);
}

const ev = {
  achievement: (uuid: string, id: string, difficulty: "easy" | "normal" | "hard" | "legendary", name?: string) => ({
    type: "achievement",
    uuid,
    achievementId: id,
    difficulty,
    ...(name ? { name } : {}),
  }),
  city: (uuid: string, cityId: string, members: number) => ({ type: "city", uuid, cityId, members }),
  playtime: (uuid: string, totalSeconds: number) => ({ type: "playtime", uuid, totalSeconds }),
  activity: (uuid: string, activity: string, eventId: string, amount?: number) => ({
    type: "activity",
    uuid,
    activity,
    eventId,
    ...(amount ? { amount } : {}),
  }),
};

function signedRequest(
  method: "GET" | "POST",
  path: string,
  body = "",
  opts: { secret?: string; ts?: number; signPath?: string; signBody?: string; query?: string } = {},
) {
  const ts = String(opts.ts ?? Date.now());
  const secret = opts.secret ?? getEnv().PLUGIN_API_SECRET;
  const signature = signPluginRequest(secret, ts, method, opts.signPath ?? path, opts.signBody ?? body);
  return new Request(`http://localhost:3000${path}${opts.query ?? ""}`, {
    method,
    headers: { "content-type": "application/json", "x-tuesday-timestamp": ts, "x-tuesday-signature": signature },
    body: method === "POST" ? body : undefined,
  });
}

async function resetThrottle(userId: string) {
  await db.update(player).set({ linkCheckedAt: null }).where(eq(player.userId, userId));
}

/* -------------------------------- main -------------------------------- */

async function main() {
  const dbUrl = new URL(getEnv().DATABASE_URL);
  if (!["127.0.0.1", "localhost", "::1"].includes(dbUrl.hostname)) {
    console.error(`Отказ: DATABASE_URL указывает на ${dbUrl.hostname}. Тест удаляет данные и должен идти только на локальной БД.`);
    process.exit(2);
  }

  await cleanup();
  await createUser(A, DISCORD_A);
  await createUser(B, DISCORD_B);
  await createUser(C, DISCORD_C);

  let expected = 0; // ожидаемый баланс игрока A

  group("Награды игрока, который ещё не привязал аккаунт (копятся, пока нет привязки)");
  await test("достижения/город/активность до привязки уходят в pending", async () => {
    let r = await processEvent(ev.achievement(UUID_A, "first-blood", "easy", "TestPlayerA"));
    assert.deepEqual(r, { status: "pending", amount: REWARDS.achievement.easy });
    r = await processEvent(ev.achievement(UUID_A, "dragon", "hard"));
    assert.deepEqual(r, { status: "pending", amount: REWARDS.achievement.hard });
    r = await processEvent(ev.city(UUID_A, "city-1", 10));
    assert.deepEqual(r, { status: "pending", amount: REWARDS.city.amount });
    r = await processEvent(ev.activity(UUID_A, "event", "evt-1"));
    assert.deepEqual(r, { status: "pending", amount: REWARDS.activity.event });
    const rows = await db.select().from(pendingReward).where(eq(pendingReward.mcUuid, UUID_A));
    assert.equal(rows.length, 4);
  });

  await test("повторная отправка тех же событий не дублирует pending", async () => {
    const r = await processEvent(ev.achievement(UUID_A, "first-blood", "easy"));
    assert.equal(r.status, "duplicate");
    const rows = await db.select().from(pendingReward).where(eq(pendingReward.mcUuid, UUID_A));
    assert.equal(rows.length, 4);
  });

  group("Привязка через DiscordSRV");
  await test("Discord без записи в DiscordSRV: not_linked", async () => {
    const res = await syncLink(C, { force: true });
    assert.equal(res?.link, "not_linked");
    assert.equal(res?.player.mcUuid, null);
  });

  await test("Discord со связкой: linked, UUID нормализован, ник из события плагина", async () => {
    const res = await syncLink(A, { force: true });
    assert.equal(res?.link, "linked");
    assert.equal(res?.player.mcUuid, UUID_A);
    assert.equal(res?.player.mcName, "TestPlayerA");
  });

  await test("при привязке зачисляются накопленные награды (4 шт.)", async () => {
    expected = REWARDS.achievement.easy + REWARDS.achievement.hard + REWARDS.city.amount + REWARDS.activity.event;
    assert.equal(await balanceOf(A), expected);
    const rows = await db.select().from(pendingReward).where(eq(pendingReward.mcUuid, UUID_A));
    assert.equal(rows.length, 0, "pending должен очиститься");
  });

  await test("повтор старых событий после привязки не начисляет второй раз", async () => {
    for (const e of [
      ev.achievement(UUID_A, "first-blood", "easy"),
      ev.achievement(UUID_A, "dragon", "hard"),
      ev.city(UUID_A, "city-1", 10),
      ev.activity(UUID_A, "event", "evt-1"),
    ]) {
      assert.equal((await processEvent(e)).status, "duplicate");
    }
    assert.equal(await balanceOf(A), expected);
  });

  group("Правила начислений");
  await test("достижения: сумма зависит от сложности", async () => {
    expectCredited(await processEvent(ev.achievement(UUID_A, "ach-normal", "normal")), REWARDS.achievement.normal);
    expectCredited(await processEvent(ev.achievement(UUID_A, "ach-legend", "legendary")), REWARDS.achievement.legendary);
    expected += REWARDS.achievement.normal + REWARDS.achievement.legendary;
    assert.equal(await balanceOf(A), expected);
  });

  await test("город: один раз на все города, меньше 10 человек не считается", async () => {
    assert.equal((await processEvent(ev.city(UUID_A, "city-2", 25))).status, "duplicate");
    const small = await processEvent(ev.city(UUID_B, "city-b", REWARDS.city.minMembers - 1));
    assert.equal(small.status, "ignored");
    assert.equal(await balanceOf(A), expected);
  });

  await test("наигранное время: первое событие только запоминает точку отсчёта", async () => {
    assert.equal((await processEvent(ev.playtime(UUID_A, 2 * 3600 + 100))).status, "ignored");
    assert.equal(await balanceOf(A), expected);
  });

  await test("наигранное время: платятся только новые полные часы, повтор не платит", async () => {
    const units = 3;
    expectCredited(await processEvent(ev.playtime(UUID_A, (2 + units) * 3600 + 5)), units * REWARDS.playtime.amountPerUnit);
    expected += units * REWARDS.playtime.amountPerUnit;
    assert.equal((await processEvent(ev.playtime(UUID_A, (2 + units) * 3600 + 5))).status, "ignored");
    assert.equal(await balanceOf(A), expected);
  });

  await test("наигранное время: за одно событие не больше maxUnitsPerEvent", async () => {
    const { maxUnitsPerEvent, amountPerUnit } = REWARDS.playtime;
    expectCredited(await processEvent(ev.playtime(UUID_A, 5 * 3600 + 100 * 3600)), maxUnitsPerEvent * amountPerUnit);
    expected += maxUnitsPerEvent * amountPerUnit;
    assert.equal(await balanceOf(A), expected);
  });

  await test("активности: известные коды, custom с суммой, ошибки валидации", async () => {
    expectCredited(await processEvent(ev.activity(UUID_A, "vote", "vote-1")), REWARDS.activity.vote);
    expectCredited(await processEvent(ev.activity(UUID_A, "custom", "special-1", 100)), 100);
    expected += REWARDS.activity.vote + 100;
    assert.equal((await processEvent(ev.activity(UUID_A, "unknown_code", "x1"))).status, "invalid");
    assert.equal((await processEvent(ev.activity(UUID_A, "custom", "x2"))).status, "invalid");
    assert.equal((await processEvent(ev.activity(UUID_A, "custom", "x3", REWARDS.customActivityMax + 1))).status, "invalid");
    assert.equal((await processEvent({ type: "achievement", uuid: "not-a-uuid", achievementId: "a", difficulty: "easy" })).status, "invalid");
    assert.equal((await processEvent({ type: "nope" })).status, "invalid");
    assert.equal(await balanceOf(A), expected);
  });

  await test("UUID с дефисами и без них - один и тот же игрок", async () => {
    const r = await processEvent(ev.achievement(formatUuid(UUID_A).toUpperCase(), "ach-dash", "easy"));
    expectCredited(r, REWARDS.achievement.easy);
    expected += REWARDS.achievement.easy;
    assert.equal(await balanceOf(A), expected);
  });

  group("Параллельность (гонки)");
  await test("20 одновременных одинаковых событий: начислено ровно один раз", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => processEvent(ev.activity(UUID_A, "vote", "race-same"))));
    assert.equal(results.filter((r) => r.status === "credited").length, 1);
    assert.equal(results.filter((r) => r.status === "duplicate").length, 19);
    expected += REWARDS.activity.vote;
    assert.equal(await balanceOf(A), expected);
  });

  await test("20 одновременных разных событий: начислены все, сумма верна", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => processEvent(ev.activity(UUID_A, "vote", `race-diff-${i}`))),
    );
    assert.equal(results.filter((r) => r.status === "credited").length, 20);
    expected += 20 * REWARDS.activity.vote;
    assert.equal(await balanceOf(A), expected);
  });

  await test("журнал ledger согласован с балансом", async () => {
    await assertLedgerConsistent(A);
  });

  group("Магазин");
  const [limited] = await db
    .insert(shopItem)
    .values({ slug: "smoketest-limited", name: "Алмазы x16 (тест)", price: 50, stock: 3, commands: ["give {player} minecraft:diamond 16"] })
    .$returningId();
  const [unlimited] = await db
    .insert(shopItem)
    .values({ slug: "smoketest-unlimited", name: "Яблоки (тест)", price: 30, stock: null, commands: ["give {player} minecraft:golden_apple 8"] })
    .$returningId();

  await test("10 параллельных покупок товара с остатком 3: ровно 3 успешных, остаток 0", async () => {
    await setBalance(A, 200);
    const settled = await Promise.allSettled(Array.from({ length: 10 }, () => purchaseItem(A, limited.id)));
    const ok = settled.filter((s) => s.status === "fulfilled");
    const bad = settled.filter((s): s is PromiseRejectedResult => s.status === "rejected");
    assert.equal(ok.length, 3, `успешных: ${ok.length}`);
    for (const b of bad) assert.ok(b.reason instanceof ShopError && b.reason.code === "out_of_stock", String(b.reason));
    const [item] = await db.select().from(shopItem).where(eq(shopItem.id, limited.id));
    assert.equal(item.stock, 0);
    assert.equal(await balanceOf(A), 200 - 3 * 50);
    const orders = await db.select().from(shopOrder).where(and(eq(shopOrder.userId, A), eq(shopOrder.itemId, limited.id)));
    assert.equal(orders.length, 3);
  });

  await test("5 параллельных покупок при балансе на одну: ровно 1 успешная, баланс не в минус", async () => {
    const settled = await Promise.allSettled(Array.from({ length: 5 }, () => purchaseItem(A, unlimited.id)));
    assert.equal(settled.filter((s) => s.status === "fulfilled").length, 1);
    for (const s of settled) {
      if (s.status === "rejected") assert.ok(s.reason instanceof ShopError && s.reason.code === "insufficient_funds", String(s.reason));
    }
    assert.equal(await balanceOf(A), 50 - 30);
  });

  await test("неудачная покупка не оставляет следов (ни заказа, ни записи в ledger, ни списания стока)", async () => {
    const ledgerBefore = (await db.select().from(ledger).where(eq(ledger.userId, A))).length;
    const ordersBefore = (await db.select().from(shopOrder).where(eq(shopOrder.userId, A))).length;
    await assert.rejects(() => purchaseItem(A, unlimited.id), (e: unknown) => e instanceof ShopError && e.code === "insufficient_funds");
    assert.equal((await db.select().from(ledger).where(eq(ledger.userId, A))).length, ledgerBefore);
    assert.equal((await db.select().from(shopOrder).where(eq(shopOrder.userId, A))).length, ordersBefore);
  });

  await test("без привязанного игрового аккаунта покупка запрещена", async () => {
    await assert.rejects(() => purchaseItem(C, unlimited.id), (e: unknown) => e instanceof ShopError && e.code === "not_linked");
  });

  await test("несуществующий и отключённый товар", async () => {
    await assert.rejects(() => purchaseItem(A, 999_999), (e: unknown) => e instanceof ShopError && e.code === "not_found");
    await db.update(shopItem).set({ enabled: false }).where(eq(shopItem.id, unlimited.id));
    await assert.rejects(() => purchaseItem(A, unlimited.id), (e: unknown) => e instanceof ShopError && e.code === "disabled");
    await db.update(shopItem).set({ enabled: true }).where(eq(shopItem.id, unlimited.id));
  });

  group("Выдача заказов плагином");
  let orderIds: number[] = [];
  await test("плагин забирает заказы с командами и UUID; повторный опрос пуст", async () => {
    const first = await claimOrders(100);
    orderIds = first.map((o) => o.id);
    assert.equal(first.length, 4);
    for (const o of first) {
      assert.equal(o.uuid, formatUuid(UUID_A));
      assert.ok(o.commands.every((c) => c.includes("{player}")));
    }
    assert.deepEqual(await claimOrders(100), []);
  });

  await test("delivered: ok, повтор already, противоположный итог conflict", async () => {
    assert.equal(await completeOrder(orderIds[0], "delivered"), "ok");
    assert.equal(await completeOrder(orderIds[0], "delivered"), "already");
    assert.equal(await completeOrder(orderIds[0], "failed", "поздно"), "conflict");
    assert.equal(await completeOrder(123456789, "delivered"), "not_found");
  });

  await test("failed: возврат Вторничков и остатка товара, повтор не возвращает второй раз", async () => {
    const order = (await db.select().from(shopOrder).where(eq(shopOrder.id, orderIds[1])))[0];
    const before = await balanceOf(A);
    const [itemBefore] = await db.select().from(shopItem).where(eq(shopItem.id, order.itemId));
    assert.equal(await completeOrder(order.id, "failed", "сервер выключен"), "ok");
    assert.equal(await balanceOf(A), before + order.price);
    const [itemAfter] = await db.select().from(shopItem).where(eq(shopItem.id, order.itemId));
    assert.equal(itemAfter.stock, itemBefore.stock === null ? null : itemBefore.stock + 1);
    assert.equal(await completeOrder(order.id, "failed"), "already");
    assert.equal(await balanceOf(A), before + order.price);
    const refunds = await db.select().from(ledger).where(and(eq(ledger.userId, A), eq(ledger.idempotencyKey, `refund:${order.id}`)));
    assert.equal(refunds.length, 1);
  });

  await test("заказ, который плагин забрал, но не подтвердил, возвращается после истечения аренды", async () => {
    await db.update(shopOrder).set({ claimedAt: new Date(Date.now() - 10 * 60_000) }).where(eq(shopOrder.id, orderIds[2]));
    const again = await claimOrders(100);
    assert.deepEqual(again.map((o) => o.id), [orderIds[2]]);
    assert.equal(await completeOrder(orderIds[2], "delivered"), "ok");
  });

  await test("возврат за товар без учёта остатка не создаёт остаток из ничего", async () => {
    const order = (await db.select().from(shopOrder).where(eq(shopOrder.id, orderIds[3])))[0];
    assert.equal(order.itemId, unlimited.id);
    assert.equal(await completeOrder(order.id, "failed", "тест"), "ok");
    const [item] = await db.select().from(shopItem).where(eq(shopItem.id, unlimited.id));
    assert.equal(item.stock, null);
  });

  await test("итоговый баланс и журнал ledger согласованы", async () => {
    assert.equal(await balanceOf(A), 20 + 50 + 30);
    await assertLedgerConsistent(A);
  });

  group("HTTP API плагина и подпись запросов");
  await test("верная подпись принимается", async () => {
    const body = JSON.stringify({ events: [ev.achievement(UUID_B, "b-first", "easy")] });
    const res = await eventsPost(signedRequest("POST", "/api/plugin/events", body));
    assert.equal(res.status, 200);
    const json = (await res.json()) as { results: EventResult[] };
    // B ещё не синхронизирован с DiscordSRV, значит награда ждёт привязки
    assert.equal(json.results[0].status, "pending");
  });

  await test("битое событие в пачке не мешает остальным", async () => {
    const body = JSON.stringify({ events: [ev.achievement(UUID_A, "batch-ok", "easy"), { type: "nope" }] });
    const res = await eventsPost(signedRequest("POST", "/api/plugin/events", body));
    const json = (await res.json()) as { results: EventResult[] };
    assert.equal(json.results[0].status, "credited");
    assert.equal(json.results[1].status, "invalid");
  });

  await test("отклоняются: чужой секрет, подмена тела, чужой путь, старая метка времени, нет заголовков, мусорная подпись", async () => {
    const body = JSON.stringify({ events: [ev.achievement(UUID_A, "evil", "legendary")] });
    const bad = [
      signedRequest("POST", "/api/plugin/events", body, { secret: "x".repeat(40) }),
      signedRequest("POST", "/api/plugin/events", body, { signBody: JSON.stringify({ events: [] }) }),
      signedRequest("POST", "/api/plugin/events", body, { signPath: "/api/plugin/orders" }),
      signedRequest("POST", "/api/plugin/events", body, { ts: Date.now() - 10 * 60_000 }),
      new Request("http://localhost:3000/api/plugin/events", { method: "POST", body }),
      new Request("http://localhost:3000/api/plugin/events", {
        method: "POST",
        body,
        headers: { "x-tuesday-timestamp": String(Date.now()), "x-tuesday-signature": "zz" },
      }),
    ];
    for (const req of bad) {
      const res = await eventsPost(req);
      assert.equal(res.status, 401);
    }
    assert.equal((await processEvent(ev.achievement(UUID_A, "evil", "legendary"))).status, "credited", "контроль: событие обработалось бы, если бы подпись прошла");
    expected = -1; // дальше баланс A сверяем по ledger, а не по счётчику
  });

  await test("verifyPluginRequest: подпись зависит от метода", async () => {
    const req = signedRequest("POST", "/api/plugin/orders", "", { signPath: "/api/plugin/orders" });
    const getReq = new Request(req.url, { method: "GET", headers: req.headers });
    const result = await verifyPluginRequest(getReq);
    assert.equal(result.ok, false);
  });

  await test("GET /api/plugin/orders и POST /api/plugin/orders/{id} работают по подписи", async () => {
    await setBalance(A, 100);
    const { orderId } = await purchaseItem(A, unlimited.id);
    const list = await ordersGet(signedRequest("GET", "/api/plugin/orders", "", { query: "?limit=10" }));
    assert.equal(list.status, 200);
    const listJson = (await list.json()) as { orders: { id: number }[] };
    assert.deepEqual(listJson.orders.map((o) => o.id), [orderId]);

    const path = `/api/plugin/orders/${orderId}`;
    const done = await orderCompletePost(signedRequest("POST", path, JSON.stringify({ status: "delivered" })), {
      params: Promise.resolve({ id: String(orderId) }),
    });
    assert.equal(done.status, 200);
    const again = await orderCompletePost(signedRequest("POST", path, JSON.stringify({ status: "failed" })), {
      params: Promise.resolve({ id: String(orderId) }),
    });
    assert.equal(again.status, 409);
    const badList = await ordersGet(signedRequest("GET", "/api/plugin/orders", "", { query: "?limit=abc" }));
    assert.equal(badList.status, 400);
  });

  await test("после всех операций ledger согласован у обоих игроков", async () => {
    await assertLedgerConsistent(A);
    await syncLink(B, { force: true });
    await assertLedgerConsistent(B);
    assert.equal(await balanceOf(B), REWARDS.achievement.easy, "награда B, полученная до привязки, зачислена при привязке");
  });

  /* ---------------- привязка/отвязка в DiscordSRV (нужен админ-доступ) ---------------- */
  const adminUrl = process.env.TEST_DISCORDSRV_ADMIN_URL;
  if (adminUrl) {
    group("Изменения связок в DiscordSRV");
    const table = getEnv().DISCORDSRV_TABLE;
    const admin = await createConnection(adminUrl);
    const restore = async () => {
      await admin.query(`DELETE FROM \`${table}\` WHERE discord IN (?, ?, ?)`, [DISCORD_A, DISCORD_B, DISCORD_C]);
      await admin.query(`INSERT INTO \`${table}\` (discord, uuid) VALUES (?, ?), (?, ?)`, [
        DISCORD_A,
        formatUuid(UUID_A),
        DISCORD_B,
        formatUuid(UUID_B),
      ]);
    };
    try {
      await test("игрок отвязал Discord в игре: сайт снимает привязку, баланс сохраняется", async () => {
        const balance = await balanceOf(A);
        await admin.query(`DELETE FROM \`${table}\` WHERE discord = ?`, [DISCORD_A]);
        await resetThrottle(A);
        const res = await syncLink(A);
        assert.equal(res?.link, "not_linked");
        assert.equal(res?.player.mcUuid, null);
        assert.equal(await balanceOf(A), balance);
        await assert.rejects(() => purchaseItem(A, unlimited.id), (e: unknown) => e instanceof ShopError && e.code === "not_linked");
      });

      await test("награды за время без привязки снова копятся и зачисляются при повторной привязке", async () => {
        const before = await balanceOf(A);
        assert.equal((await processEvent(ev.activity(UUID_A, "event", "while-unlinked"))).status, "pending");
        await admin.query(`INSERT INTO \`${table}\` (discord, uuid) VALUES (?, ?)`, [DISCORD_A, formatUuid(UUID_A)]);
        await resetThrottle(A);
        const res = await syncLink(A);
        assert.equal(res?.link, "linked");
        assert.deepEqual(res?.claimed, { count: 1, total: REWARDS.activity.event });
        assert.equal(await balanceOf(A), before + REWARDS.activity.event);
      });

      await test("UUID перепривязали к другому Discord: он переходит новому владельцу, старый теряет привязку", async () => {
        await admin.query(`DELETE FROM \`${table}\` WHERE discord IN (?, ?)`, [DISCORD_A, DISCORD_B]);
        await admin.query(`INSERT INTO \`${table}\` (discord, uuid) VALUES (?, ?)`, [DISCORD_B, formatUuid(UUID_A)]);
        await resetThrottle(B);
        const resB = await syncLink(B);
        assert.equal(resB?.link, "linked");
        assert.equal(resB?.player.mcUuid, UUID_A);
        assert.equal((await getPlayer(A))?.mcUuid, null, "у прежнего владельца привязка должна сняться");
      });

      await test("защита от частых проверок: повторный запрос в пределах интервала не ходит в БД DiscordSRV", async () => {
        await restore();
        await resetThrottle(A);
        const first = await syncLink(A, { force: true });
        assert.equal(first?.link, "linked");
        await admin.query(`DELETE FROM \`${table}\` WHERE discord = ?`, [DISCORD_A]);
        const second = await syncLink(A, { force: true }); // < 5 секунд после первой проверки
        assert.equal(second?.link, "linked", "ответ должен прийти из кэша");
      });
    } finally {
      await restore();
      await admin.end();
    }
  } else {
    console.log("\n(пропущено: проверки привязки/отвязки. Задайте TEST_DISCORDSRV_ADMIN_URL, чтобы включить)");
  }

  await cleanup();
  console.log(`\nИтого: ${passed} успешно, ${failed} с ошибками`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("Тест прерван:", error);
  try {
    await cleanup();
  } catch {}
  process.exit(1);
});
