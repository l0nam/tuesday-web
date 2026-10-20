import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { errorResponse } from "@/lib/utils/http";

/**
 * Проверка запросов от плагина на сервере Minecraft.
 *
 * Плагин подписывает каждый запрос общим секретом (PLUGIN_API_SECRET):
 *   X-Tuesday-Timestamp: время отправки в миллисекундах (Unix epoch)
 *   X-Tuesday-Signature: hex(HMAC-SHA256(secret, `${timestamp}\n${METHOD}\n${pathname}\n${body}`))
 *
 * pathname - путь без домена и без query, например /api/plugin/events. Для GET body - пустая строка.
 * Запросы старше 5 минут отклоняются. Повторная отправка того же события безопасна,
 * потому что начисления идемпотентны (см. lib/wallet.ts).
 */

const MAX_SKEW_MS = 5 * 60_000;
const MAX_BODY_BYTES = 256 * 1024;

export function signPluginRequest(secret: string, timestamp: string, method: string, pathname: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}\n${method.toUpperCase()}\n${pathname}\n${body}`).digest("hex");
}

export type PluginAuthResult = { ok: true; body: string } | { ok: false; response: Response };

export async function verifyPluginRequest(req: Request): Promise<PluginAuthResult> {
  const timestamp = req.headers.get("x-tuesday-timestamp");
  const signature = req.headers.get("x-tuesday-signature");
  if (!timestamp || !signature) {
    return { ok: false, response: errorResponse(401, "unauthorized", "Нет заголовков подписи") };
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) {
    return {
      ok: false,
      response: errorResponse(401, "stale_timestamp", "Время запроса вне допустимого окна (проверьте часы сервера)"),
    };
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, "too_large", "Слишком большое тело запроса") };
  }

  const body = await req.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, "too_large", "Слишком большое тело запроса") };
  }

  const pathname = new URL(req.url).pathname;
  const expected = Buffer.from(signPluginRequest(getEnv().PLUGIN_API_SECRET, timestamp, req.method, pathname, body), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, response: errorResponse(401, "bad_signature", "Неверная подпись") };
  }

  return { ok: true, body };
}
