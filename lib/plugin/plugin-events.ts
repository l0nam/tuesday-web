import { and, eq, ne, or, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withTransaction } from "@/lib/db";
import { mcProfile, playtimeProgress, player } from "@/lib/db/schema";
import { rememberName } from "@/lib/minecraft/mojang";
import { DONATE_TIERS } from "@/lib/profile/config";
import {
  recordPlaytime,
  recordPresence,
  setCityMembership,
  setDonate,
} from "@/lib/profile/record";
import {
  ACHIEVEMENT_DIFFICULTIES,
  ACHIEVEMENT_TIERS,
  ACTIVITY_CODES,
  REWARDS,
  type AchievementDifficulty,
  type AchievementTier,
} from "@/lib/economy/rewards/config";
import {
  claimIfLinked,
  grantRewardTx,
  type GrantResult,
} from "@/lib/economy/wallet";
import { MC_NAME_RE, normalizeUuid } from "../utils/formatting";

const uuidField = z.string().transform((value, ctx) => {
  const normalized = normalizeUuid(value);
  if (!normalized) {
    ctx.addIssue({ code: "custom", message: "некорректный UUID" });
    return z.NEVER;
  }
  return normalized;
});

const nameField = z.string().regex(MC_NAME_RE).optional();
const keyField = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\w.:\/\-]+$/, "допустимы буквы, цифры и . _ : / -");

const achievementTierInput = z.enum(ACHIEVEMENT_TIERS);

const achievementEvent = z.object({
  type: z.literal("achievement"),
  uuid: uuidField,
  name: nameField,
  // Minecraft namespaced keys may contain a slash, e.g. minecraft:story/mine_diamond.
  achievementId: keyField,
  tier: achievementTierInput.optional(),
  // Legacy compatibility; the site maps these to task, goal or challenge.
  difficulty: z.enum(ACHIEVEMENT_DIFFICULTIES).optional(),
});

const skinUrlField = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "textures.minecraft.net" &&
      url.pathname.startsWith("/texture/") &&
      /^[a-f0-9]{32,128}$/i.test(url.pathname.slice("/texture/".length))
    );
  } catch {
    return false;
  }
}, "ожидается текстура textures.minecraft.net");

const skinEvent = z.object({
  type: z.literal("skin"),
  uuid: uuidField,
  name: z.string().regex(MC_NAME_RE),
  skinUrl: skinUrlField,
});

const cityEvent = z.object({
  type: z.literal("city"),
  uuid: uuidField,
  name: nameField,
  cityId: keyField,
  members: z.number().int().min(0).max(100_000),
});

const playtimeEvent = z.object({
  type: z.literal("playtime"),
  uuid: uuidField,
  name: nameField,
  totalSeconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 24 * 365 * 20),
});

const activityEvent = z.object({
  type: z.literal("activity"),
  uuid: uuidField,
  name: nameField,
  activity: z.string().regex(/^[a-z0-9_]{1,32}$/),
  eventId: keyField,
  amount: z.number().int().min(1).max(REWARDS.customActivityMax).optional(),
  reason: z.string().trim().min(1).max(120).optional(),
});

const presenceEvent = z.object({
  type: z.literal("presence"),
  uuid: uuidField,
  name: nameField,
  online: z.boolean(),
});

const cityMembershipEvent = z.object({
  type: z.literal("city_membership"),
  uuid: uuidField,
  name: nameField,
  city: z
    .object({
      id: keyField,
      name: z.string().min(1).max(120),
      role: z.string().min(1).max(32).optional(),
      members: z.number().int().min(0).max(100_000).optional(),
    })
    .nullable(),
});

const donateEvent = z.object({
  type: z.literal("donate"),
  uuid: uuidField,
  name: nameField,
  tier: z
    .string()
    .regex(/^[a-z0-9_]{1,32}$/)
    .nullable(),
  expiresAt: z.iso
    .datetime({ offset: true })
    .nullish()
    .transform((value) => (value ? new Date(value) : null)),
});

export const pluginEventSchema = z.discriminatedUnion("type", [
  achievementEvent,
  skinEvent,
  cityEvent,
  playtimeEvent,
  activityEvent,
  presenceEvent,
  cityMembershipEvent,
  donateEvent,
]);
export type PluginEvent = z.infer<typeof pluginEventSchema>;

export const batchSchema = z.object({
  events: z.array(z.unknown()).min(1).max(50),
});

export type EventResult =
  | { status: "credited"; amount: number; balance: number }
  | { status: "pending"; amount: number }
  | { status: "duplicate" }
  | { status: "recorded" }
  | { status: "ignored"; reason: string }
  | { status: "invalid"; reason: string };

function fromGrant(r: GrantResult): EventResult {
  if (r.status === "unlinked") {
    return {
      status: "ignored",
      reason: "Minecraft-аккаунт не привязан к зарегистрированному профилю Tuesday",
    };
  }
  return r;
}

function resolveAchievementTier(
  tier: AchievementTier | undefined,
  difficulty: AchievementDifficulty | undefined,
): AchievementTier | null {
  if (tier) return tier;
  if (!difficulty) return null;
  const legacyMap: Record<AchievementDifficulty, AchievementTier> = {
    easy: "task",
    normal: "task",
    hard: "goal",
    legendary: "challenge",
  };
  return legacyMap[difficulty];
}

async function isRegisteredLinkedUuid(mcUuid: string): Promise<boolean> {
  const [owner] = await db
    .select({ userId: player.userId })
    .from(player)
    .where(eq(player.mcUuid, mcUuid))
    .limit(1);
  return Boolean(owner);
}

export async function processEvent(raw: unknown): Promise<EventResult> {
  const parsed = pluginEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "invalid", reason: z.prettifyError(parsed.error) };
  }
  const event = parsed.data;

  const rewardEvent =
    event.type === "achievement" ||
    event.type === "city" ||
    event.type === "playtime" ||
    event.type === "activity";
  if (rewardEvent && !(await isRegisteredLinkedUuid(event.uuid))) {
    return {
      status: "ignored",
      reason: "Minecraft-аккаунт не привязан к зарегистрированному профилю Tuesday",
    };
  }

  if (event.name) {
    try {
      await rememberName(event.uuid, event.name);
      await db
        .update(player)
        .set({ mcName: event.name })
        .where(
          and(
            eq(player.mcUuid, event.uuid),
            or(isNull(player.mcName), ne(player.mcName, event.name)),
          ),
        );
    } catch (error) {
      console.error("[plugin] не удалось сохранить ник:", error);
    }
  }

  switch (event.type) {
    case "achievement": {
      const tier = resolveAchievementTier(event.tier, event.difficulty);
      if (!tier) {
        return {
          status: "invalid",
          reason: "для достижения нужно указать tier: task, goal или challenge",
        };
      }
      const amount = REWARDS.achievement[tier];
      const result = await withTransaction((tx) =>
        grantRewardTx(tx, {
          mcUuid: event.uuid,
          amount,
          type: "achievement",
          ref: `achievement:${event.achievementId}`,
          idempotencyKey: `ach:${event.uuid}:${event.achievementId}`,
          meta: { achievementId: event.achievementId, tier },
          requireLinked: true,
        }),
      );
      if (result.status === "pending") await claimIfLinked(event.uuid);
      return fromGrant(result);
    }

    case "city": {
      if (event.members < REWARDS.city.minMembers) {
        return {
          status: "ignored",
          reason: `в клане меньше ${REWARDS.city.minMembers} участников`,
        };
      }
      const result = await withTransaction((tx) =>
        grantRewardTx(tx, {
          mcUuid: event.uuid,
          amount: REWARDS.city.amount,
          type: "city",
          ref: `city:${event.cityId}`,
          idempotencyKey: `city:${event.uuid}`,
          meta: { cityId: event.cityId, members: event.members },
          requireLinked: true,
        }),
      );
      if (result.status === "pending") await claimIfLinked(event.uuid);
      return fromGrant(result);
    }

    case "skin": {
      await db
        .insert(mcProfile)
        .values({
          mcUuid: event.uuid,
          name: event.name,
          skinUrl: event.skinUrl,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: event.name,
            skinUrl: event.skinUrl,
            updatedAt: new Date(),
          },
        });
      return { status: "recorded" };
    }

    case "presence": {
      await recordPresence(event.uuid, event.online);
      return { status: "recorded" };
    }

    case "city_membership": {
      await setCityMembership(event.uuid, event.city);
      return { status: "recorded" };
    }

    case "donate": {
      if (event.tier && !DONATE_TIERS[event.tier]) {
        return {
          status: "invalid",
          reason: `неизвестная подписка "${event.tier}". Доступны: ${Object.keys(DONATE_TIERS).join(", ")}`,
        };
      }
      await setDonate(event.uuid, event.tier, event.expiresAt ?? null);
      return { status: "recorded" };
    }

    case "playtime": {
      try {
        await recordPlaytime(event.uuid, event.totalSeconds);
      } catch (error) {
        console.error("[plugin] не удалось записать игровое время:", error);
      }

      const {
        secondsPerUnit,
        amountPerUnit,
        grantExistingTime,
        maxUnitsPerEvent,
      } = REWARDS.playtime;
      const totalUnits = Math.floor(event.totalSeconds / secondsPerUnit);

      const outcome = await withTransaction(
        async (tx): Promise<EventResult> => {
          await tx
            .insert(playtimeProgress)
            .values({
              mcUuid: event.uuid,
              creditedUnits: grantExistingTime ? 0 : totalUnits,
            })
            .onDuplicateKeyUpdate({
              set: { mcUuid: sql`${playtimeProgress.mcUuid}` },
            });
          const [progress] = await tx
            .select({ creditedUnits: playtimeProgress.creditedUnits })
            .from(playtimeProgress)
            .where(eq(playtimeProgress.mcUuid, event.uuid))
            .for("update");

          const newUnits = Math.min(
            totalUnits - progress.creditedUnits,
            maxUnitsPerEvent,
          );
          if (newUnits <= 0)
            return {
              status: "ignored",
              reason: "нет нового оплачиваемого времени",
            };

          const creditedUnits = progress.creditedUnits + newUnits;
          const grant = await grantRewardTx(tx, {
            mcUuid: event.uuid,
            amount: newUnits * amountPerUnit,
            type: "playtime",
            ref: `playtime:${creditedUnits}`,
            idempotencyKey: `playtime:${event.uuid}:${creditedUnits}`,
            meta: { units: newUnits, totalUnits: creditedUnits },
            requireLinked: true,
          });
          if (grant.status === "unlinked") return fromGrant(grant);
          await tx
            .update(playtimeProgress)
            .set({ creditedUnits })
            .where(eq(playtimeProgress.mcUuid, event.uuid));
          return fromGrant(grant);
        },
      );

      if (outcome.status === "pending") await claimIfLinked(event.uuid);
      return outcome;
    }

    case "activity": {
      const configured = REWARDS.activity[event.activity];
      let amount: number;
      if (event.amount !== undefined) {
        amount = event.amount;
      } else if (event.activity === "custom") {
        return {
          status: "invalid",
          reason: 'для активности "custom" нужно поле amount',
        };
      } else if (configured !== undefined) {
        amount = configured;
      } else {
        return {
          status: "invalid",
          reason: `неизвестный код активности "${event.activity}". Доступны: ${ACTIVITY_CODES.join(", ")}, custom`,
        };
      }

      const result = await withTransaction((tx) =>
        grantRewardTx(tx, {
          mcUuid: event.uuid,
          amount,
          type: "activity",
          ref: event.reason
            ? `activity:${event.activity}:${event.reason}`
            : `activity:${event.activity}`,
          idempotencyKey: `act:${event.eventId}:${event.uuid}`,
          meta: {
            activity: event.activity,
            eventId: event.eventId,
            ...(event.reason ? { reason: event.reason } : {}),
          },
          requireLinked: true,
        }),
      );
      if (result.status === "pending") await claimIfLinked(event.uuid);
      return fromGrant(result);
    }
  }
}

export async function processBatch(items: unknown[]): Promise<EventResult[]> {
  const results: EventResult[] = [];
  for (const item of items) {
    try {
      results.push(await processEvent(item));
    } catch (error) {
      console.error("[plugin] ошибка обработки события:", error);
      results.push({
        status: "invalid",
        reason: "внутренняя ошибка, повторите отправку",
      });
    }
  }
  return results;
}
