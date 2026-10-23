import { getEnv } from "@/lib/env";

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return jsonResponse({ error: { code, message } }, status);
}

/**
 * Защита от CSRF для POST-эндпоинтов, которыми пользуется браузер:
 * заголовок Origin должен совпадать с адресом сайта.
 * Возвращает Response с ошибкой или null, если всё в порядке.
 */
export function checkSameOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (!origin)
    return errorResponse(403, "bad_origin", "Отсутствует заголовок Origin");

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return errorResponse(403, "bad_origin", "Некорректный заголовок Origin");
  }

  const siteHost = new URL(getEnv().BETTER_AUTH_URL).host;
  const requestHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (originHost === siteHost || originHost === requestHost) return null;

  return errorResponse(403, "bad_origin", "Запрос с чужого сайта отклонён");
}
