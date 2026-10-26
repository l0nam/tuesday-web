import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { player } from "@/lib/db/schema";
import { verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { normalizeUuid } from "@/lib/utils/formatting";

const schema = z.object({ uuid: z.string().min(1).max(36) });

export async function POST(req: Request) {
  const auth = await verifyPluginRequest(req);
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = JSON.parse(auth.body);
  } catch {
    return errorResponse(400, "bad_json", "Тело запроса не является JSON");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, "bad_request", "Ожидается JSON с полем uuid");
  }

  const uuid = normalizeUuid(parsed.data.uuid);
  if (!uuid) {
    return errorResponse(400, "bad_uuid", "Некорректный Minecraft UUID");
  }

  const [owner] = await db
    .select({ userId: player.userId })
    .from(player)
    .where(eq(player.mcUuid, uuid))
    .limit(1);

  return jsonResponse({ uuid, linked: Boolean(owner) });
}
