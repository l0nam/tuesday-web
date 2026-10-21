import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { serverReview } from "@/lib/db/schema";
import { getOwnReview } from "@/lib/reviews";
import { SERVER_REVIEW_MAX_LENGTH, SERVER_REVIEW_MIN_LENGTH } from "@/lib/reviews/config";
import { checkSameOrigin, errorResponse, jsonResponse } from "@/lib/utils/http";

const bodySchema = z.object({
  text: z.string().trim().min(SERVER_REVIEW_MIN_LENGTH).max(SERVER_REVIEW_MAX_LENGTH),
});

function isDuplicateKey(error: unknown): boolean {
  let current = error as { code?: string; errno?: number; cause?: unknown } | undefined;
  for (let depth = 0; current && depth < 4; depth++) {
    if (current.code === "ER_DUP_ENTRY" || current.errno === 1062) return true;
    current = current.cause as typeof current;
  }
  return false;
}

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return errorResponse(401, "unauthorized", "Войдите через Discord");
  return jsonResponse({ review: await getOwnReview(session.user.id) });
}

export async function POST(req: Request) {
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;

  const session = await getSessionFromRequest(req);
  if (!session) return errorResponse(401, "unauthorized", "Войдите через Discord");

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_review",
      `Отзыв должен содержать от ${SERVER_REVIEW_MIN_LENGTH} до ${SERVER_REVIEW_MAX_LENGTH} символов.`,
    );
  }

  const existing = await getOwnReview(session.user.id);
  if (existing) return errorResponse(409, "already_reviewed", "Вы уже оставили отзыв. Изменить или удалить его нельзя.");

  try {
    await db.insert(serverReview).values({
      userId: session.user.id,
      text: parsed.data.text,
    });
  } catch (error) {
    // Защита от двух одновременных запросов: уникальный индекс user_id — источник истины.
    if (isDuplicateKey(error)) {
      return errorResponse(409, "already_reviewed", "Вы уже оставили отзыв. Изменить или удалить его нельзя.");
    }
    console.error("[reviews] Не удалось сохранить отзыв:", error);
    return errorResponse(500, "internal", "Не удалось сохранить отзыв. Попробуйте позже.");
  }

  return jsonResponse({ ok: true }, 201);
}
