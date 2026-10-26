import { eq, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import {
  playerCity,
  playerDay,
  playerDonate,
  playerStats,
} from "@/lib/db/schema";
import { PROFILE } from "@/lib/profile/config";
import { splitAcrossMidnight } from "@/lib/profile/stats";
import { dayKey } from "@/lib/utils/time";

const SECONDS_IN_DAY = 86_400;

export async function recordPresence(
  uuid: string,
  online: boolean,
  now: Date = new Date(),
) {
  await withTransaction(async (tx) => {
    await tx
      .insert(playerStats)
      .values({ mcUuid: uuid, online, firstSeenAt: now, lastSeenAt: now })
      .onDuplicateKeyUpdate({
        set: { online, lastSeenAt: now, updatedAt: now },
      });

    if (online) {
      await tx
        .insert(playerDay)
        .ignore()
        .values({ mcUuid: uuid, day: dayKey(now), seconds: 0 });
    }
  });
}

export async function recordPlaytime(
  uuid: string,
  totalSeconds: number,
  now: Date = new Date(),
) {
  await withTransaction(async (tx) => {
    await tx
      .insert(playerStats)
      .values({ mcUuid: uuid, firstSeenAt: now })
      .onDuplicateKeyUpdate({ set: { mcUuid: sql`${playerStats.mcUuid}` } });
    const [row] = await tx
      .select()
      .from(playerStats)
      .where(eq(playerStats.mcUuid, uuid))
      .for("update");

    if (totalSeconds < row.totalSeconds) return;

    const previousTotal = row.totalSeconds;
    const newTotal = totalSeconds;

    if (row.playtimeReportedAt) {
      const delta = newTotal - previousTotal;
      const elapsed = Math.max(
        0,
        Math.floor((now.getTime() - row.playtimeReportedAt.getTime()) / 1000),
      );
      const attributable = Math.min(
        delta,
        elapsed,
        PROFILE.maxAttributedDeltaSeconds,
      );
      if (attributable > 0) {
        for (const part of splitAcrossMidnight(
          attributable,
          row.playtimeReportedAt,
          now,
        )) {
          await tx
            .insert(playerDay)
            .values({
              mcUuid: uuid,
              day: part.day,
              seconds: Math.min(part.seconds, SECONDS_IN_DAY),
            })
            .onDuplicateKeyUpdate({
              set: {
                seconds: sql`LEAST(${playerDay.seconds} + ${part.seconds}, ${SECONDS_IN_DAY})`,
              },
            });
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

export async function setCityMembership(
  uuid: string,
  city: CityMembership | null,
) {
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

export type DonateTierSnapshot = {
  tier: "plus" | "gold";
  expiresAt: Date | null;
};

/**
 * Backwards-compatible single-tier update. With the composite primary key,
 * syncing Gold no longer overwrites Plus (or vice versa).
 */
export async function setDonate(
  uuid: string,
  tier: string | null,
  expiresAt: Date | null,
) {
  if (!tier) {
    await db.delete(playerDonate).where(eq(playerDonate.mcUuid, uuid));
    return;
  }
  await db
    .insert(playerDonate)
    .values({ mcUuid: uuid, tier, expiresAt })
    .onDuplicateKeyUpdate({ set: { expiresAt, updatedAt: new Date() } });
}

/**
 * Replaces the full set of ranks observed in LuckPerms, allowing multiple
 * temporary ranks to retain independent expiration timestamps.
 */
export async function syncDonateSnapshot(
  uuid: string,
  tiers: DonateTierSnapshot[],
) {
  await withTransaction(async (tx) => {
    await tx.delete(playerDonate).where(eq(playerDonate.mcUuid, uuid));
    if (tiers.length === 0) return;

    await tx.insert(playerDonate).values(
      tiers.map(({ tier, expiresAt }) => ({
        mcUuid: uuid,
        tier,
        expiresAt,
      })),
    );
  });
}
