import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  city,
  cityApplication,
  cityMember,
  player,
  user,
  type ApplicationStatus,
  type CityRole,
} from "@/lib/db/schema";
import {
  DEFAULT_BANNER,
  parseBannerCode,
  type Banner,
} from "@/lib/cities/banner";

function decodeBanner(code: string): Banner {
  const parsed = parseBannerCode(code);
  return parsed.ok ? parsed.banner : DEFAULT_BANNER;
}

const displayName = (mcName: string | null, userName: string) =>
  mcName ?? userName;

export interface CityListItem {
  id: number;
  name: string;
  description: string | null;
  banner: Banner;
  members: number;
  recruiting: boolean;
  hasDiscord: boolean;
  ownerName: string;
  ownerMcName: string | null;
}

async function memberCounts(): Promise<Map<number, number>> {
  const rows = await db
    .select({ cityId: cityMember.cityId, members: count() })
    .from(cityMember)
    .groupBy(cityMember.cityId);
  return new Map(rows.map((r) => [r.cityId, r.members]));
}

export async function listCities(): Promise<CityListItem[]> {
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: city.id,
        name: city.name,
        description: city.description,
        bannerCode: city.bannerCode,
        discordUrl: city.discordUrl,
        recruiting: city.recruiting,
        userName: user.name,
        mcName: player.mcName,
      })
      .from(city)
      .innerJoin(user, eq(user.id, city.ownerId))
      .leftJoin(player, eq(player.userId, city.ownerId)),
    memberCounts(),
  ]);

  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      banner: decodeBanner(r.bannerCode),
      members: counts.get(r.id) ?? 0,
      recruiting: r.recruiting,
      hasDiscord: Boolean(r.discordUrl),
      ownerName: displayName(r.mcName, r.userName),
      ownerMcName: r.mcName,
    }))
    .sort(
      (a, b) => b.members - a.members || a.name.localeCompare(b.name, "ru"),
    );
}

export interface CityDetails {
  id: number;
  name: string;
  description: string | null;
  banner: Banner;
  discordUrl: string | null;
  recruiting: boolean;
  createdAt: Date;
  members: number;
  ownerId: string;
}

export async function getCity(id: number): Promise<CityDetails | null> {
  const [row] = await db.select().from(city).where(eq(city.id, id)).limit(1);
  if (!row) return null;
  const [{ members }] = await db
    .select({ members: count() })
    .from(cityMember)
    .where(eq(cityMember.cityId, id));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    banner: decodeBanner(row.bannerCode),
    discordUrl: row.discordUrl,
    recruiting: row.recruiting,
    createdAt: row.createdAt,
    members,
    ownerId: row.ownerId,
  };
}

export interface CityResident {
  userId: string;
  role: CityRole;
  name: string;
  mcName: string | null;
  joinedAt: Date;
}

const ROLE_ORDER: Record<CityRole, number> = {
  owner: 0,
  coowner: 1,
  member: 2,
};

export async function listResidents(cityId: number): Promise<CityResident[]> {
  const rows = await db
    .select({
      userId: cityMember.userId,
      role: cityMember.role,
      joinedAt: cityMember.joinedAt,
      userName: user.name,
      mcName: player.mcName,
    })
    .from(cityMember)
    .innerJoin(user, eq(user.id, cityMember.userId))
    .leftJoin(player, eq(player.userId, cityMember.userId))
    .where(eq(cityMember.cityId, cityId))
    .orderBy(asc(cityMember.joinedAt));

  return rows
    .map((r) => ({
      userId: r.userId,
      role: r.role,
      name: displayName(r.mcName, r.userName),
      mcName: r.mcName,
      joinedAt: r.joinedAt,
    }))
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        a.joinedAt.getTime() - b.joinedAt.getTime(),
    );
}

export interface Membership {
  cityId: number;
  cityName: string;
  role: CityRole;
}

export async function getMembership(
  userId: string,
): Promise<Membership | null> {
  const [row] = await db
    .select({
      cityId: cityMember.cityId,
      role: cityMember.role,
      cityName: city.name,
    })
    .from(cityMember)
    .innerJoin(city, eq(city.id, cityMember.cityId))
    .where(eq(cityMember.userId, userId))
    .limit(1);
  return row ?? null;
}

export interface PendingApplication {
  id: number;
  name: string;
  mcName: string | null;
  message: string | null;
  createdAt: Date;
}

export async function listPendingApplications(
  cityId: number,
): Promise<PendingApplication[]> {
  const rows = await db
    .select({
      id: cityApplication.id,
      message: cityApplication.message,
      createdAt: cityApplication.createdAt,
      userName: user.name,
      mcName: player.mcName,
    })
    .from(cityApplication)
    .innerJoin(user, eq(user.id, cityApplication.userId))
    .leftJoin(player, eq(player.userId, cityApplication.userId))
    .where(
      and(
        eq(cityApplication.cityId, cityId),
        eq(cityApplication.status, "pending"),
      ),
    )
    .orderBy(asc(cityApplication.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: displayName(r.mcName, r.userName),
    mcName: r.mcName,
    message: r.message,
    createdAt: r.createdAt,
  }));
}

export interface MyApplication {
  status: ApplicationStatus;
  rejectReason: string | null;
  reviewedAt: Date | null;
}

export async function getMyApplication(
  cityId: number,
  userId: string,
): Promise<MyApplication | null> {
  const [row] = await db
    .select({
      status: cityApplication.status,
      rejectReason: cityApplication.rejectReason,
      reviewedAt: cityApplication.reviewedAt,
    })
    .from(cityApplication)
    .where(
      and(
        eq(cityApplication.cityId, cityId),
        eq(cityApplication.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface UserCity {
  id: number;
  name: string;
  role: CityRole;
  members: number;
  banner: Banner;
}

/** Клан игрока для профиля. */
export async function getCityForUser(userId: string): Promise<UserCity | null> {
  const [row] = await db
    .select({
      id: city.id,
      name: city.name,
      bannerCode: city.bannerCode,
      role: cityMember.role,
    })
    .from(cityMember)
    .innerJoin(city, eq(city.id, cityMember.cityId))
    .where(eq(cityMember.userId, userId))
    .limit(1);
  if (!row) return null;

  const [{ members }] = await db
    .select({ members: count() })
    .from(cityMember)
    .where(eq(cityMember.cityId, row.id));
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    members,
    banner: decodeBanner(row.bannerCode),
  };
}
