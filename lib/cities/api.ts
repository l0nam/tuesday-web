import type { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { CityError } from "@/lib/cities/service";
import { checkSameOrigin, errorResponse, jsonResponse } from "@/lib/utils/http";

/**
 * Обвязка для маршрутов /api/cities: защита от CSRF, проверка входа, единый формат ошибок.
 * Ошибки бизнес-логики (CityError) превращаются в { error: { code, message } } с нужным статусом.
 */
export async function handleCityRequest(
  req: Request,
  handler: (userId: string) => Promise<Response>,
): Promise<Response> {
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;

  const session = await getSessionFromRequest(req);
  if (!session) return errorResponse(401, "unauthorized", "Войдите через Discord");

  try {
    return await handler(session.user.id);
  } catch (error) {
    if (error instanceof CityError) return errorResponse(error.status, error.code, error.message);
    console.error("[cities] непредвиденная ошибка:", error);
    return errorResponse(500, "internal", "Что-то пошло не так, попробуйте ещё раз");
  }
}

/** Тело запроса по схеме; при ошибке возвращает готовый ответ 400. */
export async function readBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return { ok: false, response: errorResponse(400, "bad_request", "Некорректные данные запроса") };
  }
  return { ok: true, data: parsed.data };
}

/** Положительное целое из сегмента URL или null. */
export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export const badId = () => errorResponse(400, "bad_request", "Некорректный идентификатор");

export { jsonResponse };
