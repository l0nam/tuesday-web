import { z } from "zod";
import { verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { bucketStart, ONLINE, recordOnlineSample } from "@/lib/stats/online";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

export const runtime = "nodejs";

const serverStatusSchema = z
  .object({
    online: z.boolean(),
    players: z.number().int().min(0).max(100_000),
    max: z.number().int().min(1).max(100_000),
  })
  .refine((value) => value.players <= value.max, {
    message: "players не может превышать max",
  });

/**
 * Receives a fresh sample directly from the Minecraft server plugin.
 * HMAC signing uses the existing PLUGIN_API_SECRET.
 */
export async function POST(request: Request) {
  const auth = await verifyPluginRequest(request);
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = JSON.parse(auth.body);
  } catch {
    return errorResponse(400, "bad_json", "Тело запроса не является JSON");
  }

  const parsed = serverStatusSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      400,
      "bad_request",
      "Ожидаются online (boolean), players (целое число) и max (целое число)",
    );
  }

  try {
    const status = {
      ...parsed.data,
      players: parsed.data.online ? parsed.data.players : 0,
    };
    await recordOnlineSample(status);

    return jsonResponse({
      ok: true,
      bucket: bucketStart().toISOString(),
      sampleMinutes: ONLINE.sampleMinutes,
      online: status.online,
      players: status.players,
    });
  } catch (error) {
    console.error("[plugin/server-status] не удалось сохранить замер:", error);
    return errorResponse(
      500,
      "sample_write_failed",
      "Не удалось сохранить замер онлайна",
    );
  }
}
