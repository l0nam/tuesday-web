import { eq, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { playerCity, playerDay, playerDonate, playerStats } from "@/lib/db/schema";
import { PROFILE } from "@/lib/profile/config";
import { splitAcrossMidnight } from "@/lib/profile/stats";
import { dayKey } from "@/lib/utils/time";

/**
 * Запись данных профиля, которые присылает плагин: онлайн, игровое время, город, донат.
 * Все функции идемпотентны: повторная отправка того же события безопасна.
 */

const SECONDS_IN_DAY = 86_400;

/**
 * Вход/выход игрока и «сердцебиение» (повторное online=true пока игрок на сервере).
 * Вход (и каждое сердцебиение) отмечает сегодняшний день как «заходил», это основа стрика.
 */
export async function recordPresence(uuid: string, online: boolean, now: Date = new Date()) {
  await withTransaction(async (tx) => {
    await tx
      .insert(playerStats)
      .values({ mcUuid: uuid, online, firstSeenAt: now, lastSeenAt: now })
      .onDuplicateKeyUpdate({ set: { online, lastSeenAt: now, updatedAt: now } });

    if (online) {
      await tx.insert(playerDay).ignore().values({ mcUuid: uuid, day: dayKey(now), seconds: 0 });
    }
  });
}

/**
 * Накопительное игровое время от плагина. Прирост относится к дням тепловой карты:
 *  - первый отчёт игрока только задаёт отправную точку (история до подключения плагина неизвестна по дням);
 *  - прирост не может быть больше времени, прошедшего с прошлого отчёта, и больше maxAttributedDeltaSeconds;
 *  - если между отчётами была полночь, прирост делится между двумя днями;
 *  - общее время (total) только растёт: запоздавший повтор старого значения игнорируется целиком
 *    (если счётчик действительно обнулили, например после вайпа, удалите строку игрока из player_stats).
 * Общее время всегда точное, а тепловая карта это приблизительная картина по дням.
 */
export async function recordPlaytime(uuid: string, totalSeconds: number, now: Date = new Date()) {
  await withTransaction(async (tx) => {
    // ВАЖНО: не INSERT IGNORE. При дубликате он берёт общую (S) блокировку строки, а следующий
    // SELECT ... FOR UPDATE пытается повысить её до эксклюзивной: параллельные отчёты одного игрока
    // взаимно блокируются (deadlock). ON DUPLICATE KEY UPDATE сразу берёт эксклюзивную блокировку.
    await tx
      .insert(playerStats)
      .values({ mcUuid: uuid, firstSeenAt: now })
      .onDuplicateKeyUpdate({ set: { mcUuid: sql`${playerStats.mcUuid}` } });
    const [row] = await tx.select().from(playerStats).where(eq(playerStats.mcUuid, uuid)).for("update");

    // Запоздавший повтор старого отчёта: ничего не меняем (ни время, ни метку отчёта)
    if (totalSeconds < row.totalSeconds) return;

    const previousTotal = row.totalSeconds;
    const newTotal = totalSeconds;

    if (row.playtimeReportedAt) {
      const delta = newTotal - previousTotal;
      const elapsed = Math.max(0, Math.floor((now.getTime() - row.playtimeReportedAt.getTime()) / 1000));
      const attributable = Math.min(delta, elapsed, PROFILE.maxAttributedDeltaSeconds);
      if (attributable > 0) {
        for (const part of splitAcrossMidnight(attributable, row.playtimeReportedAt, now)) {
          await tx
            .insert(playerDay)
            .values({ mcUuid: uuid, day: part.day, seconds: Math.min(part.seconds, SECONDS_IN_DAY) })
            .onDuplicateKeyUpdate({ set: { seconds: sql`LEAST(${playerDay.seconds} + ${part.seconds}, ${SECONDS_IN_DAY})` } });
        }
      }
    }

    await tx
      .update(playerStats)
      .set({ totalSeconds: newTotal, playtimeReportedAt: now, updatedAt: now })
      .where(eq(playerStats.mcUuid, uuid));
  });
}

export interface CityMembership {
  id: string;
  name: string;
  role?: string | null;
  members?: number | null;
}

/** Город игрока. null = игрок больше не состоит ни в одном городе. */
export async function setCityMembership(uuid: string, city: CityMembership | null) {
  if (!city) {
    await db.delete(playerCity).where(eq(playerCity.mcUuid, uuid));
    return;
  }
  const values = {
    cityId: city.id,
    cityName: city.name,
    role: city.role ?? null,
    members: city.members ?? null,
  };
  await db
    .insert(playerCity)
    .values({ mcUuid: uuid, ...values })
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
}

/** Донат-статус игрока. tier = null снимает статус. expiresAt = null означает «бессрочно». */
export async function setDonate(uuid: string, tier: string | null, expiresAt: Date | null) {
  if (!tier) {
    await db.delete(playerDonate).where(eq(playerDonate.mcUuid, uuid));
    return;
  }
  await db
    .insert(playerDonate)
    .values({ mcUuid: uuid, tier, expiresAt })
    .onDuplicateKeyUpdate({ set: { tier, expiresAt, updatedAt: new Date() } });
}
