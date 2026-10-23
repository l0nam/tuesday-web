import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminAudit, serverReview } from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

type Context = { params: Promise<{ reviewId: string }> };

export async function DELETE(req: Request, { params }: Context) {
  const access = await authorizeAdminRequest(req, "reviews.delete", {
    mutation: true,
  });
  if (!access.ok) return access.response;
  const reviewId = Number((await params).reviewId);
  if (!Number.isSafeInteger(reviewId) || reviewId <= 0)
    return errorResponse(400, "bad_id", "Некорректный ID отзыва");
  const [review] = await db
    .select({
      id: serverReview.id,
      userId: serverReview.userId,
      text: serverReview.text,
    })
    .from(serverReview)
    .where(eq(serverReview.id, reviewId))
    .limit(1);
  if (!review) return errorResponse(404, "not_found", "Отзыв не найден");
  await db.delete(serverReview).where(eq(serverReview.id, reviewId));
  await db
    .insert(adminAudit)
    .values({
      actorUserId: access.identity.userId,
      targetUserId: review.userId,
      action: "review.deleted",
      meta: { reviewId, excerpt: review.text.slice(0, 120) },
    });
  return jsonResponse({ ok: true });
}
