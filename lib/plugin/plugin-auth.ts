import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { errorResponse } from "@/lib/utils/http";

const MAX_SKEW_MS = 5 * 60_000;
const MAX_BODY_BYTES = 256 * 1024;

export function signPluginRequest(
  secret: string,
  timestamp: string,
  method: string,
  pathname: string,
  body: string,
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}\n${method.toUpperCase()}\n${pathname}\n${body}`)
    .digest("hex");
}

export type PluginAuthResult =
  | { ok: true; body: string }
  | { ok: false; response: Response };

export async function verifyPluginRequest(
  req: Request,
): Promise<PluginAuthResult> {
  const timestamp = req.headers.get("x-tuesday-timestamp");
  const signature = req.headers.get("x-tuesday-signature");
  if (!timestamp || !signature) {
    return {
      ok: false,
      response: errorResponse(401, "unauthorized", "Нет заголовков подписи"),
    };
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "stale_timestamp",
        "Время запроса вне допустимого окна (проверьте часы сервера)",
      ),
    };
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(413, "too_large", "Слишком большое тело запроса"),
    };
  }

  const body = await req.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(413, "too_large", "Слишком большое тело запроса"),
    };
  }

  const pathname = new URL(req.url).pathname;
  const expected = Buffer.from(
    signPluginRequest(
      getEnv().PLUGIN_API_SECRET,
      timestamp,
      req.method,
      pathname,
      body,
    ),
    "hex",
  );
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return {
      ok: false,
      response: errorResponse(401, "bad_signature", "Неверная подпись"),
    };
  }

  return { ok: true, body };
}
