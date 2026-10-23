import { count, desc, eq, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  adminAudit,
  ledger,
  player,
  serverReview,
  shopOrder,
  user,
} from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { jsonResponse } from "@/lib/utils/http";
import { alias } from "drizzle-orm/mysql-core";

const actorUser = alias(user, "actor_user");
const actorPlayer = alias(player, "actor_player");
const targetUser = alias(user, "target_user");
const targetPlayer = alias(player, "target_player");

export async function GET(req: Request) {
  const access = await authorizeAdminRequest(req, "dashboard.read");
  if (!access.ok) return access.response;

  const [
    [usersCount],
    playersResult,
    ordersResult,
    reviewsResult,
    ledgerResult,
    auditResult,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    access.permissions.has("players.read")
      ? db.select({ value: count() }).from(player)
      : Promise.resolve([{ value: null as number | null }]),
    access.permissions.has("orders.read")
      ? db.select({ value: count() }).from(shopOrder)
      : Promise.resolve([{ value: null as number | null }]),
    access.permissions.has("reviews.read")
      ? db.select({ value: count() }).from(serverReview)
      : Promise.resolve([{ value: null as number | null }]),
    access.permissions.has("economy.read")
      ? db.select({ value: sum(ledger.amount) }).from(ledger)
      : Promise.resolve([{ value: null as string | number | null }]),
    access.permissions.has("audit.read")
      ? db
          .select({
            id: adminAudit.id,
            action: adminAudit.action,
            actorUserId: adminAudit.actorUserId,
            targetUserId: adminAudit.targetUserId,
            meta: adminAudit.meta,
            createdAt: adminAudit.createdAt,

            actorName: actorUser.name,
            actorMcName: actorPlayer.mcName,

            targetName: targetUser.name,
            targetMcName: targetPlayer.mcName,
          })
          .from(adminAudit)
          .leftJoin(actorUser, eq(adminAudit.actorUserId, actorUser.id))
          .leftJoin(actorPlayer, eq(actorUser.id, actorPlayer.userId))
          .leftJoin(targetUser, eq(adminAudit.targetUserId, targetUser.id))
          .leftJoin(targetPlayer, eq(targetUser.id, targetPlayer.userId))
          .orderBy(desc(adminAudit.id))
          .limit(8)
      : Promise.resolve([]),
  ]);
  return jsonResponse({
    users: usersCount.value,
    registeredPlayers: playersResult[0].value,
    purchases: ordersResult[0].value,
    reviews: reviewsResult[0].value,
    netLedger:
      ledgerResult[0].value == null ? null : Number(ledgerResult[0].value),
    latestAudit: auditResult,
    isAdmin: access.identity.isAdmin,
    permissions: [...access.permissions],
  });
}
