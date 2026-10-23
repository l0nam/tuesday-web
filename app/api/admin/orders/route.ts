import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { player, shopOrder, user } from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { jsonResponse } from "@/lib/utils/http";

export async function GET(req: Request) {
  const access = await authorizeAdminRequest(req, "orders.read");
  if (!access.ok) return access.response;
  const rows = await db
    .select({
      id: shopOrder.id,
      userId: shopOrder.userId,
      userName: user.name,
      mcName: shopOrder.mcName,
      discordId: player.discordId,
      itemName: shopOrder.itemName,
      price: shopOrder.price,
      status: shopOrder.status,
      failReason: shopOrder.failReason,
      createdAt: shopOrder.createdAt,
      claimedAt: shopOrder.claimedAt,
      completedAt: shopOrder.completedAt,
    })
    .from(shopOrder)
    .innerJoin(user, eq(user.id, shopOrder.userId))
    .innerJoin(player, eq(player.userId, shopOrder.userId))
    .orderBy(desc(shopOrder.id))
    .limit(150);
  return jsonResponse({ orders: rows, permissions: [...access.permissions] });
}
