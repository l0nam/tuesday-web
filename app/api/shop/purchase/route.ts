import { z } from "zod";
import { checkSameOrigin, errorResponse, jsonResponse } from "@/lib/utils/http";
import { ShopError, purchaseItem } from "@/lib/economy/shop";
import { getSessionFromRequest } from "@/lib/auth/session";

const bodySchema = z.object({ itemId: z.number().int().positive() });

export async function POST(req: Request) {
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;

  const session = await getSessionFromRequest(req);
  if (!session) return errorResponse(401, "unauthorized", "Войдите через Discord");

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return errorResponse(400, "bad_request", "Ожидается { itemId: number }");

  try {
    const result = await purchaseItem(session.user.id, body.data.itemId);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof ShopError) {
      return jsonResponse({ error: { code: error.code, message: error.message, ...error.details } }, error.status);
    }
    console.error("[shop] ошибка покупки:", error);
    return errorResponse(500, "internal", "Не удалось оформить покупку, попробуйте ещё раз");
  }
}
