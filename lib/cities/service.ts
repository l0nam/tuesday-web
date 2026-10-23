import { and, count, eq, ne } from "drizzle-orm";
import { db, withTransaction, type Tx } from "@/lib/db";
import {
  city,
  cityApplication,
  cityMember,
  player,
  type City,
  type CityRole,
} from "@/lib/db/schema";
import { affectedRows, credit, insertId } from "@/lib/economy/wallet";
import { parseBannerInput, serializeBanner } from "@/lib/cities/banner";
import {
  CITY,
  cityNameKey,
  normalizeDiscordUrl,
  validateCityName,
} from "@/lib/cities/rules";

export class CityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CityError";
  }
}

function duplicateKeyMessage(error: unknown): string | null {
  let current = error as
    | {
        code?: string;
        errno?: number;
        sqlMessage?: string;
        message?: string;
        cause?: unknown;
      }
    | undefined;
  for (let depth = 0; current && depth < 4; depth++) {
    if (current.code === "ER_DUP_ENTRY" || current.errno === 1062) {
      return String(current.sqlMessage ?? current.message ?? "");
    }
    current = current.cause as typeof current;
  }
  return null;
}

function isDeadlock(error: unknown): boolean {
  let current = error as
    | { code?: string; errno?: number; cause?: unknown }
    | undefined;
  for (let depth = 0; current && depth < 4; depth++) {
    if (current.code === "ER_LOCK_DEADLOCK" || current.errno === 1213)
      return true;
    current = current.cause as typeof current;
  }
  return false;
}

async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await withTransaction(fn);
    } catch (error) {
      if (attempt >= 3 || !isDeadlock(error)) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 15 * attempt + Math.random() * 30),
      );
    }
  }
}

function optionalText(
  raw: string | null | undefined,
  max: number,
  what: string,
): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (Array.from(text).length > max)
    throw new CityError("too_long", `${what}: не больше ${max} символов`);
  return text;
}

/* ------------------------------------------------------------------ */
/* Создание города и настройки                                          */
/* ------------------------------------------------------------------ */

export interface CreateCityInput {
  name: string;
  description?: string | null;
  discordUrl?: string | null;
  banner: string;
  recruiting?: boolean;
}

export async function createCity(
  userId: string,
  input: CreateCityInput,
): Promise<{ id: number }> {
  const name = validateCityName(input.name);
  if (!name.ok) throw new CityError("bad_name", name.error);

  const description = optionalText(
    input.description,
    CITY.descriptionMax,
    "Описание",
  );

  const discord = normalizeDiscordUrl(input.discordUrl ?? "");
  if (!discord.ok) throw new CityError("bad_discord", discord.error);

  const banner = parseBannerInput(input.banner);
  if (!banner.ok) throw new CityError("bad_banner", `Флаг: ${banner.error}`);

  const [owner] = await db
    .select({ mcUuid: player.mcUuid })
    .from(player)
    .where(eq(player.userId, userId))
    .limit(1);
  if (!owner) throw new CityError("no_account", "Войдите через Discord", 401);
  if (!owner.mcUuid) {
    throw new CityError(
      "not_linked",
      "Чтобы создать город, привяжите Discord к игровому аккаунту (раздел «Профиль»)",
      403,
    );
  }

  try {
    return await inTransaction(async (tx) => {
      const [membership] = await tx
        .select({ cityId: cityMember.cityId })
        .from(cityMember)
        .where(eq(cityMember.userId, userId))
        .limit(1);
      if (membership)
        throw new CityError(
          "already_in_city",
          "Вы уже состоите в городе. Сначала покиньте его",
          409,
        );

      const key = cityNameKey(name.name);
      const [taken] = await tx
        .select({ id: city.id })
        .from(city)
        .where(eq(city.nameKey, key))
        .limit(1);
      if (taken)
        throw new CityError(
          "name_taken",
          "Город с таким названием уже есть",
          409,
        );

      const inserted = await tx.insert(city).values({
        name: name.name,
        nameKey: key,
        description,
        ownerId: userId,
        bannerCode: serializeBanner(banner.banner),
        discordUrl: discord.url,
        recruiting: input.recruiting ?? true,
      });
      const id = insertId(inserted);
      await tx.insert(cityMember).values({ userId, cityId: id, role: "owner" });
      await tx
        .update(cityApplication)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(cityApplication.userId, userId),
            eq(cityApplication.status, "pending"),
          ),
        );
      return { id };
    });
  } catch (error) {
    if (error instanceof CityError) throw error;
    const dup = duplicateKeyMessage(error);
    if (dup) {
      if (dup.includes("name_key"))
        throw new CityError(
          "name_taken",
          "Город с таким названием уже есть",
          409,
        );
      if (dup.includes("owner_id"))
        throw new CityError("already_owner", "Вы уже создали город", 409);
      throw new CityError("already_in_city", "Вы уже состоите в городе", 409);
    }
    throw error;
  }
}

export interface CitySettingsPatch {
  recruiting?: boolean;
  discordUrl?: string | null;
  description?: string | null;
}

export async function updateCitySettings(
  userId: string,
  cityId: number,
  patch: CitySettingsPatch,
): Promise<void> {
  const set: Partial<Pick<City, "recruiting" | "discordUrl" | "description">> =
    {};

  if (patch.recruiting !== undefined) set.recruiting = patch.recruiting;
  if (patch.discordUrl !== undefined) {
    const discord = normalizeDiscordUrl(patch.discordUrl ?? "");
    if (!discord.ok) throw new CityError("bad_discord", discord.error);
    set.discordUrl = discord.url;
  }
  if (patch.description !== undefined) {
    set.description = optionalText(
      patch.description,
      CITY.descriptionMax,
      "Описание",
    );
  }
  if (Object.keys(set).length === 0) return;

  const [row] = await db
    .select({ ownerId: city.ownerId })
    .from(city)
    .where(eq(city.id, cityId))
    .limit(1);
  if (!row) throw new CityError("not_found", "Город не найден", 404);
  if (row.ownerId !== userId)
    throw new CityError(
      "forbidden",
      "Настройки города может менять только владелец",
      403,
    );

  await db.update(city).set(set).where(eq(city.id, cityId));
}

/* ------------------------------------------------------------------ */
/* Заявки                                                               */
/* ------------------------------------------------------------------ */

export async function applyToCity(
  userId: string,
  cityId: number,
  message?: string | null,
): Promise<void> {
  const text = optionalText(message, CITY.messageMax, "Сообщение");

  await inTransaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(city)
      .where(eq(city.id, cityId))
      .limit(1);
    if (!target) throw new CityError("not_found", "Город не найден", 404);
    if (!target.recruiting)
      throw new CityError(
        "recruiting_closed",
        "Набор в этот город сейчас закрыт",
        409,
      );

    const [membership] = await tx
      .select({ cityId: cityMember.cityId })
      .from(cityMember)
      .where(eq(cityMember.userId, userId))
      .limit(1);
    if (membership) {
      throw new CityError(
        membership.cityId === cityId ? "already_member" : "already_in_city",
        membership.cityId === cityId
          ? "Вы уже живёте в этом городе"
          : "Вы уже состоите в другом городе. Сначала покиньте его",
        409,
      );
    }

    const [existing] = await tx
      .select()
      .from(cityApplication)
      .where(
        and(
          eq(cityApplication.cityId, cityId),
          eq(cityApplication.userId, userId),
        ),
      )
      .for("update");

    if (existing?.status === "pending")
      throw new CityError("already_applied", "Заявка уже подана", 409);

    if (existing?.status === "rejected" && existing.reviewedAt) {
      const waitMs =
        existing.reviewedAt.getTime() +
        CITY.reapplyCooldownHours * 3_600_000 -
        Date.now();
      if (waitMs > 0) {
        const hours = Math.ceil(waitMs / 3_600_000);
        throw new CityError(
          "cooldown",
          `Повторную заявку в этот город можно подать примерно через ${hours} ч.`,
          429,
        );
      }
    }

    const [{ pending }] = await tx
      .select({ pending: count() })
      .from(cityApplication)
      .where(
        and(
          eq(cityApplication.userId, userId),
          eq(cityApplication.status, "pending"),
        ),
      );
    if (pending >= CITY.maxPendingApplications) {
      throw new CityError(
        "too_many_applications",
        `Нельзя держать больше ${CITY.maxPendingApplications} заявок одновременно. Отзовите одну из них`,
        409,
      );
    }

    const now = new Date();
    if (existing) {
      await tx
        .update(cityApplication)
        .set({
          status: "pending",
          message: text,
          rejectReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: now,
        })
        .where(eq(cityApplication.id, existing.id));
      return;
    }

    try {
      await tx
        .insert(cityApplication)
        .values({ cityId, userId, message: text });
    } catch (error) {
      if (duplicateKeyMessage(error))
        throw new CityError("already_applied", "Заявка уже подана", 409);
      throw error;
    }
  });
}

export async function cancelApplication(
  userId: string,
  cityId: number,
): Promise<void> {
  const result = await db
    .update(cityApplication)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(cityApplication.cityId, cityId),
        eq(cityApplication.userId, userId),
        eq(cityApplication.status, "pending"),
      ),
    );
  if (affectedRows(result) === 0)
    throw new CityError("not_found", "Активной заявки нет", 404);
}

export type ReviewDecision =
  | { action: "accept" }
  | { action: "reject"; reason: string };

export type ReviewResult =
  | { status: "accepted"; rewardGranted: boolean }
  | { status: "rejected" }
  | { status: "applicant_unavailable" };

export async function reviewApplication(
  reviewerId: string,
  cityId: number,
  applicationId: number,
  decision: ReviewDecision,
): Promise<ReviewResult> {
  let reason: string | null = null;
  if (decision.action === "reject") {
    reason = decision.reason.trim();
    const length = Array.from(reason).length;
    if (length < CITY.reasonMin) {
      throw new CityError(
        "reason_required",
        "Укажите причину отказа, чтобы игрок понимал, что исправить",
      );
    }
    if (length > CITY.reasonMax) {
      throw new CityError(
        "too_long",
        `Причина: не больше ${CITY.reasonMax} символов`,
      );
    }
  }

  return inTransaction(async (tx): Promise<ReviewResult> => {
    const [target] = await tx
      .select()
      .from(city)
      .where(eq(city.id, cityId))
      .for("update");
    if (!target) throw new CityError("not_found", "Город не найден", 404);

    const reviewer = await memberRole(tx, cityId, reviewerId);
    if (reviewer !== "owner" && reviewer !== "coowner") {
      throw new CityError(
        "forbidden",
        "Заявки рассматривают владелец и совладельцы города",
        403,
      );
    }

    const [application] = await tx
      .select()
      .from(cityApplication)
      .where(
        and(
          eq(cityApplication.id, applicationId),
          eq(cityApplication.cityId, cityId),
        ),
      )
      .for("update");
    if (!application)
      throw new CityError("not_found", "Заявка не найдена", 404);
    if (application.status === "cancelled") {
      throw new CityError(
        "application_closed",
        "Заявка закрыта: игрок отозвал её или уже вступил в другой город",
        409,
      );
    }
    if (application.status !== "pending")
      throw new CityError("already_reviewed", "Заявка уже рассмотрена", 409);

    const now = new Date();
    const reviewed = { reviewedBy: reviewerId, reviewedAt: now };

    if (decision.action === "reject") {
      await tx
        .update(cityApplication)
        .set({ status: "rejected", rejectReason: reason, ...reviewed })
        .where(eq(cityApplication.id, application.id));
      return { status: "rejected" };
    }

    const closeAsUnavailable = async (): Promise<ReviewResult> => {
      await tx
        .update(cityApplication)
        .set({ status: "cancelled", rejectReason: null, ...reviewed })
        .where(eq(cityApplication.id, application.id));
      return { status: "applicant_unavailable" };
    };

    await tx
      .select({ id: player.userId })
      .from(player)
      .where(eq(player.userId, application.userId))
      .for("update");

    const [already] = await tx
      .select({ cityId: cityMember.cityId })
      .from(cityMember)
      .where(eq(cityMember.userId, application.userId))
      .limit(1);
    if (already) return closeAsUnavailable();

    try {
      await tx.insert(cityMember).values({
        userId: application.userId,
        cityId,
        role: "member",
        joinedAt: now,
      });
    } catch (error) {
      if (duplicateKeyMessage(error)) return closeAsUnavailable();
      throw error;
    }

    await tx
      .update(cityApplication)
      .set({ status: "accepted", rejectReason: null, ...reviewed })
      .where(eq(cityApplication.id, application.id));

    await tx
      .update(cityApplication)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(cityApplication.userId, application.userId),
          eq(cityApplication.status, "pending"),
          ne(cityApplication.id, application.id),
        ),
      );

    const rewardGranted = await grantOwnerRewardIfEligible(tx, target);
    return { status: "accepted", rewardGranted };
  });
}

/* ------------------------------------------------------------------ */
/* Жители                                                               */
/* ------------------------------------------------------------------ */

async function memberRole(
  tx: Tx,
  cityId: number,
  userId: string,
): Promise<CityRole | null> {
  const [row] = await tx
    .select({ role: cityMember.role })
    .from(cityMember)
    .where(and(eq(cityMember.cityId, cityId), eq(cityMember.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function setMemberRole(
  actorId: string,
  cityId: number,
  targetUserId: string,
  role: Exclude<CityRole, "owner">,
): Promise<void> {
  await inTransaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(city)
      .where(eq(city.id, cityId))
      .for("update");
    if (!target) throw new CityError("not_found", "Город не найден", 404);
    if (target.ownerId !== actorId)
      throw new CityError(
        "forbidden",
        "Совладельцев назначает только владелец",
        403,
      );

    const current = await memberRole(tx, cityId, targetUserId);
    if (!current)
      throw new CityError(
        "not_found",
        "Этот игрок не живёт в вашем городе",
        404,
      );
    if (current === "owner")
      throw new CityError("bad_request", "Владельца изменить нельзя");

    await tx
      .update(cityMember)
      .set({ role })
      .where(
        and(eq(cityMember.cityId, cityId), eq(cityMember.userId, targetUserId)),
      );
  });
}

export async function removeMember(
  actorId: string,
  cityId: number,
  targetUserId: string,
): Promise<void> {
  if (actorId === targetUserId)
    throw new CityError(
      "bad_request",
      "Чтобы уйти из города, используйте кнопку «Покинуть город»",
    );

  await inTransaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(city)
      .where(eq(city.id, cityId))
      .for("update");
    if (!target) throw new CityError("not_found", "Город не найден", 404);

    const actor = await memberRole(tx, cityId, actorId);
    if (actor !== "owner" && actor !== "coowner") {
      throw new CityError(
        "forbidden",
        "Исключать жителей могут владелец и совладельцы",
        403,
      );
    }

    const role = await memberRole(tx, cityId, targetUserId);
    if (!role)
      throw new CityError(
        "not_found",
        "Этот игрок не живёт в вашем городе",
        404,
      );
    if (role === "owner")
      throw new CityError("forbidden", "Владельца исключить нельзя", 403);
    if (role === "coowner" && actor !== "owner") {
      throw new CityError(
        "forbidden",
        "Совладельца может исключить только владелец",
        403,
      );
    }

    await tx
      .delete(cityMember)
      .where(
        and(eq(cityMember.cityId, cityId), eq(cityMember.userId, targetUserId)),
      );
  });
}

export async function leaveCity(userId: string, cityId: number): Promise<void> {
  await inTransaction(async (tx) => {
    const role = await memberRole(tx, cityId, userId);
    if (!role)
      throw new CityError("not_found", "Вы не живёте в этом городе", 404);
    if (role === "owner")
      throw new CityError(
        "forbidden",
        "Владелец не может покинуть свой город",
        403,
      );
    await tx
      .delete(cityMember)
      .where(and(eq(cityMember.cityId, cityId), eq(cityMember.userId, userId)));
  });
}

/* ------------------------------------------------------------------ */
/* Награда                                                              */
/* ------------------------------------------------------------------ */

async function grantOwnerRewardIfEligible(
  tx: Tx,
  target: City,
): Promise<boolean> {
  const [{ members }] = await tx
    .select({ members: count() })
    .from(cityMember)
    .where(eq(cityMember.cityId, target.id));
  if (members < CITY.rewardMinMembers) return false;

  const [owner] = await tx
    .select({ mcUuid: player.mcUuid })
    .from(player)
    .where(eq(player.userId, target.ownerId))
    .limit(1);

  const result = await credit(tx, {
    userId: target.ownerId,
    amount: CITY.rewardAmount,
    type: "city",
    ref: `city:${target.id}`,
    idempotencyKey: owner?.mcUuid
      ? `city:${owner.mcUuid}`
      : `city:user:${target.ownerId}`,
    meta: { cityId: target.id, members, source: "site" },
  });
  return result.applied;
}
