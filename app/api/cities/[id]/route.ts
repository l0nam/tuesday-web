import { z } from "zod";
import { badId, handleCityRequest, jsonResponse, parseId, readBody } from "@/lib/cities/api";
import { updateCitySettings } from "@/lib/cities/service";

// Названия и флага здесь намеренно нет: они не меняются
const bodySchema = z
  .object({
    recruiting: z.boolean(),
    discordUrl: z.string().max(500).nullable(),
    description: z.string().max(2000).nullable(),
  })
  .partial()
  .strict();

/** Настройки города (только владелец): набор, Discord-сервер, описание. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cityId = parseId((await params).id);
  if (!cityId) return badId();

  return handleCityRequest(req, async (userId) => {
    const body = await readBody(req, bodySchema);
    if (!body.ok) return body.response;
    await updateCitySettings(userId, cityId, body.data);
    return jsonResponse({ ok: true });
  });
}
