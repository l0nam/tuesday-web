/**
 * Демо-профиль для разработки: заполняет локальную БД данными игрока DemoPlayer
 * (история заходов за полгода, город, донат, описание, роли), чтобы страницу /players/DemoPlayer
 * можно было посмотреть без плагина. Запуск: npm run db:seed-demo. Удалить: npm run db:seed-demo -- --clean
 *
 * Работает только с локальной БД (localhost), чтобы случайно не наполнить боевую.
 */
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, mcProfile, player, playerCity, playerDay, playerDiscord, playerDonate, playerStats, user } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { addDays, dayKey } from "@/lib/utils/time";

loadEnvConfig(process.cwd());

const UUID = "de000000000000000000000000000001";
const NAME = "DemoPlayer";
const USER_ID = "demo-player-user";
const DISCORD_ID = "100000000000009999";

const BIO = `Привет! Я **DemoPlayer**: строю, торгую и иногда взрываю чужие фермы (случайно).

## Чем занимаюсь
- строю большой порт в городе
- собираю *редкие* предметы
- помогаю новичкам: пишите в Discord

> Лучший день на сервере это вторник.

Мой любимый моб: \`creeper\`. Карта мира: [наша вики](https://example.com/wiki).`;

async function clean() {
  await db.delete(user).where(eq(user.id, USER_ID));
  for (const table of [playerStats, playerDay, playerDonate, playerCity, playerDiscord, mcProfile]) {
    await db.delete(table).where(eq(table.mcUuid, UUID));
  }
}

async function main() {
  const host = new URL(getEnv().DATABASE_URL).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    console.error(`Отказ: DATABASE_URL указывает на ${host}. Демо-данные можно сеять только в локальную БД.`);
    process.exit(2);
  }

  await clean();
  if (process.argv.includes("--clean")) {
    console.log("Демо-профиль удалён.");
    process.exit(0);
  }

  const now = new Date();
  const today = dayKey(now);

  await db.insert(mcProfile).values({ mcUuid: UUID, name: NAME });
  await db.insert(user).values({ id: USER_ID, name: NAME, email: "demo-player@demo.local" });
  await db.insert(account).values({ id: "demo-player-acc", accountId: DISCORD_ID, providerId: "discord", userId: USER_ID });
  await db.insert(player).values({
    userId: USER_ID,
    discordId: DISCORD_ID,
    mcUuid: UUID,
    mcName: NAME,
    balance: 1250,
    bio: BIO,
  });
  // Кэш Discord заполнен заранее и «свежий», поэтому демо работает без бота
  await db.insert(playerDiscord).values({
    mcUuid: UUID,
    discordId: DISCORD_ID,
    username: "demo_player",
    roles: ["moderator", "player"],
    checkedAt: new Date(now.getTime() + 365 * 86_400_000),
  });

  // Псевдослучайная, но повторяемая история: ~70% дней с заходом, свежая серия из 9 дней
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let total = 0;
  for (let i = 0; i < 26 * 7; i += 1) {
    const day = addDays(today, -i);
    const inStreak = i < 9;
    if (!inStreak && (i === 9 || rand() > 0.7)) continue; // день 9 пропущен: серия обрывается ровно на 9
    const seconds = Math.round((0.3 + rand() * 6.5) * 3600);
    total += seconds;
    await db.insert(playerDay).values({ mcUuid: UUID, day, seconds });
  }
  await db.insert(playerStats).values({
    mcUuid: UUID,
    totalSeconds: total + 1500 * 3600, // + время до подключения плагина
    online: true,
    firstSeenAt: new Date("2025-02-01T00:00:00Z"),
    lastSeenAt: now,
    playtimeReportedAt: now,
  });
  await db.insert(playerCity).values({ mcUuid: UUID, cityId: "sunny", cityName: "Солнечный", role: "owner", members: 14 });
  await db.insert(playerDonate).values({ mcUuid: UUID, tier: "veterok", expiresAt: new Date(now.getTime() + 20 * 86_400_000) });

  console.log(`Готово: откройте /players/${NAME}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
