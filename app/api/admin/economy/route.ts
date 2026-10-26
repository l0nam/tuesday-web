import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { db } from "@/lib/db";
import { adminAudit, appSetting, shopItem } from "@/lib/db/schema";
import {
  applyEditableRewardSettings,
  editableRewardSettingsSchema,
  parseRewardSettings,
  REWARD_SETTING_KEY,
  toEditableRewardSettings,
  DEFAULT_REWARD_SETTINGS,
  type EditableRewardSettings,
} from "@/lib/economy/rewards/settings";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

const priceSchema = z.object({
  id: z.number().int().positive(),
  price: z.number().int().min(1).max(2_000_000_000),
});

const saveSchema = z
  .object({
    prices: z.array(priceSchema).min(1).max(200),
    rewards: editableRewardSettingsSchema,
  })
  .strict()
  .refine(
    (body) => new Set(body.prices.map((item) => item.id)).size === body.prices.length,
    { message: "В списке цен есть повторяющиеся товары" },
  );

class MissingItemsError extends Error {}

async function listItems() {
  return db
    .select({
      id: shopItem.id,
      slug: shopItem.slug,
      name: shopItem.name,
      price: shopItem.price,
      enabled: shopItem.enabled,
      fulfillmentMode: shopItem.fulfillmentMode,
    })
    .from(shopItem)
    .orderBy(asc(shopItem.sortOrder), asc(shopItem.id));
}

async function getEditableRewards() {
  const [row] = await db
    .select({ value: appSetting.value })
    .from(appSetting)
    .where(eq(appSetting.key, REWARD_SETTING_KEY))
    .limit(1);
  return toEditableRewardSettings(
    row ? parseRewardSettings(row.value) : DEFAULT_REWARD_SETTINGS,
  );
}

export async function GET(req: Request) {
  const access = await authorizeAdminRequest(req, "orders.manage", {
    rootOnly: true,
  });
  if (!access.ok) return access.response;

  const [items, rewards] = await Promise.all([listItems(), getEditableRewards()]);
  return jsonResponse({ items, rewards });
}

export async function PATCH(req: Request) {
  const access = await authorizeAdminRequest(req, "orders.manage", {
    rootOnly: true,
    mutation: true,
  });
  if (!access.ok) return access.response;

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(
      400,
      "bad_request",
      parsed.error.issues[0]?.message ?? "Некорректные настройки магазина",
    );
  }

  const { prices, rewards } = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const ids = prices.map((item) => item.id);
      const currentItems = await tx
        .select({ id: shopItem.id, name: shopItem.name, price: shopItem.price })
        .from(shopItem)
        .where(inArray(shopItem.id, ids));
      if (currentItems.length !== ids.length) throw new MissingItemsError();

      const [stored] = await tx
        .select({ value: appSetting.value })
        .from(appSetting)
        .where(eq(appSetting.key, REWARD_SETTING_KEY))
        .limit(1);
      const previousRewards = stored
        ? parseRewardSettings(stored.value)
        : DEFAULT_REWARD_SETTINGS;
      const nextRewards = applyEditableRewardSettings(previousRewards, rewards);
      const priceChanges: { id: number; name: string; before: number; after: number }[] = [];

      for (const update of prices) {
        const current = currentItems.find((item) => item.id === update.id);
        if (!current || current.price === update.price) continue;
        priceChanges.push({
          id: current.id,
          name: current.name,
          before: current.price,
          after: update.price,
        });
        await tx
          .update(shopItem)
          .set({ price: update.price, updatedAt: new Date() })
          .where(eq(shopItem.id, update.id));
      }

      await tx
        .insert(appSetting)
        .values({
          key: REWARD_SETTING_KEY,
          value: nextRewards,
          updatedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: { value: nextRewards, updatedAt: new Date() },
        });

      await tx.insert(adminAudit).values({
        actorUserId: access.identity.userId,
        action: "economy.config.update",
        meta: {
          priceChanges,
          rewardsBefore: toEditableRewardSettings(previousRewards),
          rewardsAfter: rewards satisfies EditableRewardSettings,
        },
      });
    });

    const [items, savedRewards] = await Promise.all([
      listItems(),
      getEditableRewards(),
    ]);
    return jsonResponse({ ok: true, items, rewards: savedRewards });
  } catch (error) {
    if (error instanceof MissingItemsError) {
      return errorResponse(
        404,
        "shop_items_changed",
        "Список товаров изменился. Обнови страницу и повтори сохранение",
      );
    }
    console.error("[admin/economy] failed to save configuration:", error);
    return errorResponse(
      500,
      "save_failed",
      "Не удалось сохранить настройки магазина и наград",
    );
  }
}
