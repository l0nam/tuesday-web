import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, withTransaction } from "@/lib/db";
import { adminAudit, ledger, player, shopOrder, user } from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { credit, debit } from "@/lib/economy/wallet";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

const adjustmentSchema = z.object({ amount: z.number().int().min(-2_000_000_000).max(2_000_000_000).refine((n) => n !== 0), reason: z.string().trim().min(3).max(180) });

type Context = { params: Promise<{ userId: string }> };

export async function GET(req: Request, { params }: Context) {
  const access = await authorizeAdminRequest(req, "players.read");
  if (!access.ok) return access.response;
  const { userId } = await params;
  const [target] = await db.select({ userId: user.id, name: user.name, image: user.image, createdAt: user.createdAt, discordId: player.discordId, mcName: player.mcName, mcUuid: player.mcUuid, balance: player.balance, linkedAt: player.linkedAt }).from(user).innerJoin(player, eq(player.userId, user.id)).where(eq(user.id, userId)).limit(1);
  if (!target) return errorResponse(404, "not_found", "Игрок не найден");
  const [transactions, orders] = await Promise.all([
    access.permissions.has("economy.read")
      ? db.select({ id: ledger.id, amount: ledger.amount, balanceAfter: ledger.balanceAfter, type: ledger.type, ref: ledger.ref, meta: ledger.meta, createdAt: ledger.createdAt }).from(ledger).where(eq(ledger.userId, userId)).orderBy(desc(ledger.id)).limit(50)
      : Promise.resolve([]),
    access.permissions.has("orders.read")
      ? db.select({ id: shopOrder.id, itemName: shopOrder.itemName, price: shopOrder.price, status: shopOrder.status, failReason: shopOrder.failReason, createdAt: shopOrder.createdAt, completedAt: shopOrder.completedAt }).from(shopOrder).where(eq(shopOrder.userId, userId)).orderBy(desc(shopOrder.id)).limit(30)
      : Promise.resolve([]),
  ]);
  return jsonResponse({ player: target, transactions, orders, permissions: [...access.permissions] });
}

export async function POST(req: Request, { params }: Context) {
  const access = await authorizeAdminRequest(req, "economy.adjust", { mutation: true });
  if (!access.ok) return access.response;
  const { userId } = await params;
  const parsed = adjustmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "bad_request", "Укажи ненулевую целую сумму и причину (3–180 символов)");
  const { amount, reason } = parsed.data;
  try {
    const result = await withTransaction(async (tx) => {
      const [target] = await tx.select({ userId: player.userId }).from(player).where(eq(player.userId, userId)).for("update");
      if (!target) throw new Error("PLAYER_NOT_FOUND");
      const key = `admin:${randomUUID()}`;
      const money = amount > 0
        ? await credit(tx, { userId, amount, type: "admin", ref: reason, idempotencyKey: key, meta: { actorUserId: access.identity.userId, reason } })
        : await debit(tx, { userId, amount: Math.abs(amount), type: "admin", ref: reason, idempotencyKey: key, meta: { actorUserId: access.identity.userId, reason } });
      await tx.insert(adminAudit).values({ actorUserId: access.identity.userId, targetUserId: userId, action: "economy.adjust", meta: { amount, reason, balance: money.balance } });
      return money;
    });
    return jsonResponse({ ok: true, balance: result.balance });
  } catch (error) {
    if (error instanceof Error && error.message === "PLAYER_NOT_FOUND") return errorResponse(404, "not_found", "Игрок не найден");
    if (error instanceof Error && error.name === "InsufficientFundsError") return errorResponse(409, "insufficient_funds", "На балансе игрока недостаточно Вторничков");
    console.error("[admin] balance adjustment failed", error);
    return errorResponse(400, "adjustment_failed", "Не удалось изменить баланс; проверь сумму и баланс игрока");
  }
}
