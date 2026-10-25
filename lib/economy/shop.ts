import { and, asc, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { player, shopItem, shopOrder } from "@/lib/db/schema";
import {
  credit,
  debit,
  InsufficientFundsError,
  insertId,
} from "@/lib/economy/wallet";
import { formatUuid } from "../utils/formatting";

export type ShopErrorCode =
  | "not_linked"
  | "not_found"
  | "disabled"
  | "out_of_stock"
  | "insufficient_funds";

export class ShopError extends Error {
  constructor(
    public readonly code: ShopErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ShopError";
  }
}

export const ORDER_LEASE_MS = 5 * 60_000;

export async function listShopItems() {
  return db
    .select({
      id: shopItem.id,
      slug: shopItem.slug,
      name: shopItem.name,
      description: shopItem.description,
      imageUrl: shopItem.imageUrl,
      price: shopItem.price,
      stock: shopItem.stock,
    })
    .from(shopItem)
    .where(eq(shopItem.enabled, true))
    .orderBy(asc(shopItem.sortOrder), asc(shopItem.id));
}

export async function purchaseItem(userId: string, itemId: number) {
  try {
    return await withTransaction(async (tx) => {
      const [buyer] = await tx
        .select({ mcUuid: player.mcUuid, mcName: player.mcName })
        .from(player)
        .where(eq(player.userId, userId))
        .limit(1);
      if (!buyer?.mcUuid) {
        throw new ShopError(
          "not_linked",
          "Привяжите Discord к игровому аккаунту, чтобы пользоваться магазином",
          409,
        );
      }

      const [item] = await tx
        .select()
        .from(shopItem)
        .where(eq(shopItem.id, itemId))
        .for("update");
      if (!item) throw new ShopError("not_found", "Товар не найден", 404);
      if (!item.enabled || item.price < 1)
        throw new ShopError("disabled", "Товар сейчас недоступен", 410);

      if (item.stock !== null) {
        if (item.stock <= 0)
          throw new ShopError("out_of_stock", "Товар закончился", 409);
        await tx
          .update(shopItem)
          .set({ stock: item.stock - 1 })
          .where(eq(shopItem.id, item.id));
      }

      const inserted = await tx.insert(shopOrder).values({
        userId,
        itemId: item.id,
        itemName: item.name,
        mcUuid: buyer.mcUuid,
        mcName: buyer.mcName,
        price: item.price,
        commands: item.commands,
        fulfillmentMode: item.fulfillmentMode,
        status: "pending",
      });
      const orderId = insertId(inserted);

      const { balance } = await debit(tx, {
        userId,
        amount: item.price,
        type: "shop_purchase",
        ref: item.name,
        idempotencyKey: `purchase:${orderId}`,
        meta: { orderId, itemId: item.id },
      });

      return { orderId, balance, itemName: item.name };
    });
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      throw new ShopError(
        "insufficient_funds",
        "Недостаточно Вторничков",
        402,
        {
          balance: error.balance,
          required: error.required,
        },
      );
    }
    throw error;
  }
}

export interface PluginOrder {
  id: number;
  uuid: string;
  player: string | null;
  item: string;
  commands: string[];
}

export async function claimOrders(limit = 20): Promise<PluginOrder[]> {
  const leaseCutoff = new Date(Date.now() - ORDER_LEASE_MS);

  return withTransaction(async (tx) => {
    // fulfillmentMode/commands are copied into shop_order at purchase time.
    // If a pending order was created before its shop item was switched to auto,
    // the snapshot is stale. Use the current shop-item settings for unclaimed
    // orders, while keeping items that are still configured as manual excluded.
    const rows = await tx
      .select({
        order: shopOrder,
        currentCommands: shopItem.commands,
      })
      .from(shopOrder)
      .innerJoin(shopItem, eq(shopOrder.itemId, shopItem.id))
      .where(
        and(
          eq(shopItem.fulfillmentMode, "auto"),
          or(
            eq(shopOrder.status, "pending"),
            and(
              eq(shopOrder.status, "processing"),
              lt(shopOrder.claimedAt, leaseCutoff),
            ),
          ),
        ),
      )
      .orderBy(asc(shopOrder.id))
      .limit(limit)
      .for("update", { skipLocked: true });

    if (rows.length === 0) return [];

    const claimedAt = new Date();
    for (const row of rows) {
      await tx
        .update(shopOrder)
        .set({
          status: "processing",
          claimedAt,
          fulfillmentMode: "auto",
          commands: row.currentCommands,
        })
        .where(eq(shopOrder.id, row.order.id));
    }

    return rows.map(({ order, currentCommands }) => ({
      id: order.id,
      uuid: formatUuid(order.mcUuid),
      player: order.mcName,
      item: order.itemName,
      commands: currentCommands,
    }));
  });
}

export type CompleteResult = "ok" | "already" | "not_found" | "conflict";

export async function completeOrder(
  orderId: number,
  outcome: "delivered" | "failed",
  reason?: string,
): Promise<CompleteResult> {
  return withTransaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(shopOrder)
      .where(eq(shopOrder.id, orderId))
      .for("update");
    if (!order) return "not_found";
    if (order.status === outcome) return "already";
    if (order.status === "delivered" || order.status === "failed")
      return "conflict";

    const now = new Date();
    if (outcome === "delivered") {
      await tx
        .update(shopOrder)
        .set({ status: "delivered", completedAt: now })
        .where(eq(shopOrder.id, orderId));
      return "ok";
    }

    await tx
      .update(shopOrder)
      .set({
        status: "failed",
        failReason: reason?.slice(0, 255) ?? null,
        completedAt: now,
      })
      .where(eq(shopOrder.id, orderId));

    await tx
      .update(shopItem)
      .set({ stock: sql`${shopItem.stock} + 1` })
      .where(and(eq(shopItem.id, order.itemId), isNotNull(shopItem.stock)));

    await credit(tx, {
      userId: order.userId,
      amount: order.price,
      type: "shop_refund",
      ref: order.itemName,
      idempotencyKey: `refund:${order.id}`,
      meta: { orderId: order.id, reason: reason ?? null },
    });
    return "ok";
  });
}
