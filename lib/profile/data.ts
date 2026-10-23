import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  mcProfile,
  player,
  playerCity,
  playerDay,
  playerDiscord,
  playerDonate,
  playerStats,
} from "@/lib/db/schema";
import {
  discordConfigured,
  needsDiscordRefresh,
  visibleRoles,
} from "@/lib/profile/discord";
import { DONATE_TIERS, PROFILE } from "@/lib/profile/config";
import { getCityForUser } from "@/lib/cities/queries";
import type { Banner } from "@/lib/cities/banner";
import {
  buildHeatmap,
  computeStreak,
  isOnline,
  windowSeconds,
  type HeatCell,
} from "@/lib/profile/stats";
import { dayKey } from "@/lib/utils/time";
import { MC_NAME_RE } from "../utils/formatting";

export interface ProfileData {
  uuid: string;
  name: string;
  online: boolean;
  lastSeenAt: Date | null;
  roles: { key: string; label: string; tone: string }[];
  discordUsername: string | null;
  showDiscord: boolean;
  bio: string | null;
  city: {
    id: string;
    name: string;
    role: string | null;
    members: number | null;
    href: string | null;
    banner: Banner | null;
  } | null;
  donate: { tier: string; name: string; expiresAt: Date | null } | null;
  hasAccount: boolean;
  balance: number | null;
  stats: {
    totalSeconds: number;
    monthSeconds: number;
    weekSeconds: number;
    todaySeconds: number;
    streak: { current: number; best: number };
    activeDays: number;
    heatmap: HeatCell[][];
  };
  isSelf: boolean;
  discordRefreshNeeded: boolean;
  discordNeverChecked: boolean;
}

export async function findUuidByName(
  name: string,
): Promise<{ uuid: string; name: string } | null> {
  if (!MC_NAME_RE.test(name)) return null;

  const pick = { uuid: mcProfile.mcUuid, name: mcProfile.name };
  let [row] = await db
    .select(pick)
    .from(mcProfile)
    .where(eq(mcProfile.name, name))
    .orderBy(desc(mcProfile.updatedAt))
    .limit(1);
  if (!row) {
    [row] = await db
      .select(pick)
      .from(mcProfile)
      .where(sql`lower(${mcProfile.name}) = ${name.toLowerCase()}`)
      .orderBy(desc(mcProfile.updatedAt))
      .limit(1);
  }
  return row ? { uuid: row.uuid, name: row.name } : null;
}

export async function loadProfile(
  name: string,
  viewerUserId: string | null,
  now: Date = new Date(),
): Promise<ProfileData | null> {
  const found = await findUuidByName(name);
  if (!found) return null;
  const { uuid } = found;

  const [[statsRow], days, [donateRow], [cityRow], [playerRow], [discordRow]] =
    await Promise.all([
      db
        .select()
        .from(playerStats)
        .where(eq(playerStats.mcUuid, uuid))
        .limit(1),
      db
        .select({ day: playerDay.day, seconds: playerDay.seconds })
        .from(playerDay)
        .where(eq(playerDay.mcUuid, uuid)),
      db
        .select()
        .from(playerDonate)
        .where(eq(playerDonate.mcUuid, uuid))
        .limit(1),
      db.select().from(playerCity).where(eq(playerCity.mcUuid, uuid)).limit(1),
      db.select().from(player).where(eq(player.mcUuid, uuid)).limit(1),
      db
        .select()
        .from(playerDiscord)
        .where(eq(playerDiscord.mcUuid, uuid))
        .limit(1),
    ]);

  const siteCity = playerRow ? await getCityForUser(playerRow.userId) : null;

  const today = dayKey(now);
  const isSelf = Boolean(
    viewerUserId && playerRow && playerRow.userId === viewerUserId,
  );

  const donateActive =
    donateRow &&
    (!donateRow.expiresAt || donateRow.expiresAt.getTime() > now.getTime());

  return {
    uuid,
    name: found.name,
    online: isOnline(statsRow ?? null, now),
    lastSeenAt: statsRow?.lastSeenAt ?? null,
    roles: visibleRoles(discordRow?.roles ?? []).map(
      ({ key, label, tone }) => ({ key, label, tone }),
    ),
    discordUsername: discordRow?.username ?? null,
    showDiscord: playerRow?.showDiscord ?? true,
    bio: playerRow?.bio?.trim() ? playerRow.bio : null,
    city: siteCity
      ? {
          id: String(siteCity.id),
          name: siteCity.name,
          role: siteCity.role,
          members: siteCity.members,
          href: `/cities/${siteCity.id}`,
          banner: siteCity.banner,
        }
      : cityRow
        ? {
            id: cityRow.cityId,
            name: cityRow.cityName,
            role: cityRow.role,
            members: cityRow.members,
            href: null,
            banner: null,
          }
        : null,
    donate: donateActive
      ? {
          tier: donateRow.tier,
          name: DONATE_TIERS[donateRow.tier]?.name ?? donateRow.tier,
          expiresAt: donateRow.expiresAt,
        }
      : null,
    hasAccount: Boolean(playerRow),
    balance:
      playerRow && (PROFILE.balancePublic || isSelf) ? playerRow.balance : null,
    stats: {
      totalSeconds: statsRow?.totalSeconds ?? 0,
      monthSeconds: windowSeconds(days, today, 30),
      weekSeconds: windowSeconds(days, today, 7),
      todaySeconds: windowSeconds(days, today, 1),
      streak: computeStreak(
        days.map((d) => d.day),
        today,
      ),
      activeDays: days.length,
      heatmap: buildHeatmap(days, today),
    },
    isSelf,
    discordRefreshNeeded: needsDiscordRefresh(discordRow, now),
    discordNeverChecked: discordConfigured() && !discordRow?.checkedAt,
  };
}
