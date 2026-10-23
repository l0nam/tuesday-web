import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminReviewBlock, player, serverReview, user } from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { jsonResponse } from "@/lib/utils/http";

/**
 * Integration contract: serverReview must be exported by lib/db/schema.ts and have
 * id, userId, text, createdAt. If the existing review implementation uses other names,
 * change this select only; see README.md.
 */
export async function GET(req: Request) {
  const access = await authorizeAdminRequest(req, "reviews.read");
  if (!access.ok) return access.response;
  const rows = await db.select({ id: serverReview.id, userId: serverReview.userId, text: serverReview.text, createdAt: serverReview.createdAt, userName: user.name, mcName: player.mcName, discordId: player.discordId, blocked: isNotNull(adminReviewBlock.userId) }).from(serverReview).innerJoin(user, eq(user.id, serverReview.userId)).innerJoin(player, eq(player.userId, serverReview.userId)).leftJoin(adminReviewBlock, eq(adminReviewBlock.userId, serverReview.userId)).orderBy(desc(serverReview.id)).limit(150);
  const blockedUsers = access.permissions.has("reviews.block")
    ? await db.select({ userId: adminReviewBlock.userId, userName: user.name, mcName: player.mcName, discordId: player.discordId, reason: adminReviewBlock.reason, createdAt: adminReviewBlock.createdAt }).from(adminReviewBlock).innerJoin(user, eq(user.id, adminReviewBlock.userId)).innerJoin(player, eq(player.userId, adminReviewBlock.userId)).orderBy(desc(adminReviewBlock.createdAt)).limit(200)
    : [];
  return jsonResponse({ reviews: rows, blockedUsers, permissions: [...access.permissions] });
}
