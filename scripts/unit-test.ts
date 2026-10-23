/**
 * Юнит-тесты чистой логики профиля (без БД): npm run test:unit
 */
import assert from "node:assert/strict";
import {
  addDays,
  dayKey,
  epochDay,
  secondsSinceMidnight,
  weekdayIndex,
} from "@/lib/utils/time";
import {
  buildHeatmap,
  computeStreak,
  heatLevel,
  isOnline,
  splitAcrossMidnight,
  windowSeconds,
} from "@/lib/profile/stats";
import { formatAgo, formatHours, pluralRu } from "@/lib/utils/formatting";

const MSK = "Europe/Moscow";
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(
      `  ✗ ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`,
    );
  }
}

console.log("\nДаты");
test("dayKey учитывает часовой пояс (21:30 UTC = уже следующий день в Москве)", () => {
  assert.equal(dayKey(new Date("2026-10-15T21:30:00Z"), MSK), "2026-10-16");
  assert.equal(dayKey(new Date("2026-10-15T20:30:00Z"), MSK), "2026-10-15");
});
test("secondsSinceMidnight в Москве", () => {
  assert.equal(
    secondsSinceMidnight(new Date("2026-10-15T21:10:05Z"), MSK),
    10 * 60 + 5,
  );
});
test("addDays через границу месяца и года, високосный год", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});
test("weekdayIndex: понедельник = 0, воскресенье = 6", () => {
  assert.equal(weekdayIndex("2026-10-12"), 0); // понедельник
  assert.equal(weekdayIndex("2026-10-18"), 6); // воскресенье
});
test("epochDay различает соседние дни", () => {
  assert.equal(epochDay("2026-10-16") - epochDay("2026-10-15"), 1);
});

console.log("\nСтрик");
const TODAY = "2026-10-16";
test("нет заходов: 0", () =>
  assert.deepEqual(computeStreak([], TODAY), { current: 0, best: 0 }));
test("зашёл сегодня и 2 предыдущих дня: 3", () => {
  assert.deepEqual(
    computeStreak(["2026-10-16", "2026-10-15", "2026-10-14"], TODAY),
    { current: 3, best: 3 },
  );
});
test("сегодня ещё не заходил, но был вчера: серия жива", () => {
  assert.equal(computeStreak(["2026-10-15", "2026-10-14"], TODAY).current, 2);
});
test("последний заход позавчера: серия оборвана, но лучший результат помнится", () => {
  assert.deepEqual(
    computeStreak(
      ["2026-10-14", "2026-10-13", "2026-10-12", "2026-10-11"],
      TODAY,
    ),
    { current: 0, best: 4 },
  );
});
test("пропуск посередине обрывает текущую серию, лучшая берётся из истории", () => {
  const days = [
    "2026-10-16",
    "2026-10-15",
    "2026-10-12",
    "2026-10-11",
    "2026-10-10",
    "2026-10-09",
  ];
  assert.deepEqual(computeStreak(days, TODAY), { current: 2, best: 4 });
});
test("серия через границу месяца", () => {
  assert.equal(
    computeStreak(["2026-11-02", "2026-11-01", "2026-10-31"], "2026-11-02")
      .current,
    3,
  );
});
test("дубликаты дней не ломают подсчёт", () => {
  assert.equal(
    computeStreak(["2026-10-16", "2026-10-16", "2026-10-15"], TODAY).current,
    2,
  );
});

console.log("\nОкна статистики");
const rows = [
  { day: "2026-10-16", seconds: 100 },
  { day: "2026-10-10", seconds: 200 }, // ровно 7 дней включая сегодня: 16..10
  { day: "2026-10-09", seconds: 400 }, // уже за пределами недели
  { day: "2026-09-17", seconds: 800 }, // последний день 30-дневного окна
  { day: "2026-09-16", seconds: 1600 }, // за пределами месяца
];
test("сегодня", () => assert.equal(windowSeconds(rows, TODAY, 1), 100));
test("неделя (7 дней, включая сегодня)", () =>
  assert.equal(windowSeconds(rows, TODAY, 7), 300));
test("месяц (30 дней, включая сегодня)", () =>
  assert.equal(windowSeconds(rows, TODAY, 30), 100 + 200 + 400 + 800));

console.log("\nТепловая карта");
test("уровни интенсивности", () => {
  assert.deepEqual(
    [
      0,
      1,
      3599,
      3600,
      3 * 3600 - 1,
      3 * 3600,
      6 * 3600 - 1,
      6 * 3600,
      20 * 3600,
    ].map(heatLevel),
    [0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
});
test("26 недель × 7 дней, колонка = неделя с понедельника", () => {
  const grid = buildHeatmap([], TODAY, 26);
  assert.equal(grid.length, 26);
  for (const col of grid) {
    assert.equal(col.length, 7);
    assert.equal(
      weekdayIndex(col[0].day),
      0,
      "первая клетка колонки должна быть понедельником",
    );
  }
});
test("сегодня лежит в последней колонке в строке своего дня недели; следующие дни помечены как будущие", () => {
  const grid = buildHeatmap([], TODAY, 26);
  const last = grid[25];
  const todayIdx = weekdayIndex(TODAY); // пятница = 4
  assert.equal(last[todayIdx].day, TODAY);
  assert.equal(last[todayIdx].inFuture, false);
  assert.equal(last[todayIdx + 1].inFuture, true);
  assert.equal(grid.flat().filter((c) => c.inFuture).length, 6 - todayIdx);
});
test("секунды из строк попадают в нужные клетки", () => {
  const grid = buildHeatmap(
    [
      { day: TODAY, seconds: 7 * 3600 },
      { day: "2026-10-12", seconds: 100 },
    ],
    TODAY,
    26,
  );
  const cell = grid.flat().find((c) => c.day === TODAY)!;
  assert.equal(cell.seconds, 7 * 3600);
  assert.equal(cell.level, 4);
  assert.equal(grid.flat().find((c) => c.day === "2026-10-12")!.level, 1);
});
test("карта покрывает ровно 26 недель назад", () => {
  const grid = buildHeatmap([], TODAY, 26);
  assert.equal(epochDay(grid[25][0].day) - epochDay(grid[0][0].day), 25 * 7);
});

console.log("\nОнлайн");
const now = new Date("2026-10-16T12:00:00Z");
test("онлайн и недавно виден", () => {
  assert.equal(
    isOnline(
      { online: true, lastSeenAt: new Date("2026-10-16T11:55:00Z") },
      now,
    ),
    true,
  );
});
test("флаг онлайн, но давно не было сигнала (сервер упал): офлайн", () => {
  assert.equal(
    isOnline(
      { online: true, lastSeenAt: new Date("2026-10-16T11:30:00Z") },
      now,
    ),
    false,
  );
});
test("флаг офлайн или нет данных", () => {
  assert.equal(
    isOnline(
      { online: false, lastSeenAt: new Date("2026-10-16T11:59:00Z") },
      now,
    ),
    false,
  );
  assert.equal(isOnline(null, now), false);
  assert.equal(isOnline({ online: true, lastSeenAt: null }, now), false);
});

console.log("\nДеление времени через полночь");
test("в пределах одного дня: всё в этот день", () => {
  const parts = splitAcrossMidnight(
    600,
    new Date("2026-10-16T09:00:00Z"),
    new Date("2026-10-16T09:10:00Z"),
    MSK,
  );
  assert.deepEqual(parts, [{ day: "2026-10-16", seconds: 600 }]);
});
test("через полночь: часть в новый день, остаток в прошлый (23:50 → 00:10 МСК)", () => {
  // 23:50 МСК = 20:50 UTC, 00:10 МСК = 21:10 UTC
  const parts = splitAcrossMidnight(
    1200,
    new Date("2026-10-15T20:50:00Z"),
    new Date("2026-10-15T21:10:00Z"),
    MSK,
  );
  assert.deepEqual(parts, [
    { day: "2026-10-16", seconds: 600 },
    { day: "2026-10-15", seconds: 600 },
  ]);
});
test("прирост меньше времени после полуночи: всё в новый день", () => {
  const parts = splitAcrossMidnight(
    300,
    new Date("2026-10-15T20:58:00Z"),
    new Date("2026-10-15T21:30:00Z"),
    MSK,
  );
  assert.deepEqual(parts, [{ day: "2026-10-16", seconds: 300 }]);
});
test("сумма частей всегда равна приросту", () => {
  const parts = splitAcrossMidnight(
    4000,
    new Date("2026-10-15T20:00:00Z"),
    new Date("2026-10-15T21:20:00Z"),
    MSK,
  );
  assert.equal(
    parts.reduce((s, p) => s + p.seconds, 0),
    4000,
  );
});

console.log("\nФорматирование");
test("часы с одним знаком, как на макете", () => {
  assert.equal(formatHours(2029.9 * 3600), "2029.9");
  assert.equal(formatHours(0), "0.0");
});
test("относительное время по-русски", () => {
  const t = new Date("2026-10-16T12:00:00Z");
  assert.equal(formatAgo(new Date("2026-10-16T11:59:40Z"), t), "только что");
  assert.match(formatAgo(new Date("2026-10-16T11:55:00Z"), t), /5 минут назад/);
  assert.match(formatAgo(new Date("2026-10-16T09:00:00Z"), t), /3 часа назад/);
  assert.equal(formatAgo(new Date("2026-10-15T11:00:00Z"), t), "вчера");
  assert.equal(formatAgo(new Date("2026-10-14T12:00:00Z"), t), "позавчера");
  assert.match(formatAgo(new Date("2026-10-11T12:00:00Z"), t), /5 дней назад/);
});

console.log("\nСклонение");
test("день / дня / дней", () => {
  const f = (n: number) => `${n} ${pluralRu(n, "день", "дня", "дней")}`;
  assert.deepEqual(
    [0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 100, 101, 111, 112].map(f),
    [
      "0 дней",
      "1 день",
      "2 дня",
      "4 дня",
      "5 дней",
      "11 дней",
      "12 дней",
      "14 дней",
      "21 день",
      "22 дня",
      "25 дней",
      "100 дней",
      "101 день",
      "111 дней",
      "112 дней",
    ],
  );
});

console.log(`\nИтого: ${passed} успешно, ${failed} с ошибками`);
process.exit(failed === 0 ? 0 : 1);
