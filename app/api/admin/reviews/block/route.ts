import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAudit, adminReviewBlock, user } from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

const bodySchema = z.object({
  userId: z.string().min(1).max(36),
  blocked: z.boolean(),
  reason: z.string().trim().max(240).optional(),
});

export async function POST(req: Request) {
  const access = await authorizeAdminRequest(req, "reviews.block", {
    mutation: true,
  });
  if (!access.ok) return access.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return errorResponse(400, "bad_request", "Некорректные данные блокировки");
  const { userId, blocked, reason } = parsed.data;
  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!target) return errorResponse(404, "not_found", "Пользователь не найден");

  if (blocked) {
    await db
      .insert(adminReviewBlock)
      .values({
        userId,
        blockedBy: access.identity.userId,
        reason: reason?.slice(0, 240) || null,
      })
      .onDuplicateKeyUpdate({
        set: {
          blockedBy: access.identity.userId,
          reason: reason?.slice(0, 240) || null,
        },
      });
  } else {
    await db
      .delete(adminReviewBlock)
      .where(eq(adminReviewBlock.userId, userId));
  }
  await db
    .insert(adminAudit)
    .values({
      actorUserId: access.identity.userId,
      targetUserId: userId,
      action: blocked ? "review.blocked" : "review.unblocked",
      meta: { reason: reason ?? null },
    });
  return jsonResponse({ ok: true, blocked });
}
