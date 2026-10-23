import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { batchSchema, processBatch } from "@/lib/plugin/plugin-events";

export async function POST(req: Request) {
  const auth = await verifyPluginRequest(req);
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = JSON.parse(auth.body);
  } catch {
    return errorResponse(400, "bad_json", "Тело запроса не является JSON");
  }

  const batch = batchSchema.safeParse(json);
  if (!batch.success) {
    return errorResponse(
      400,
      "bad_request",
      'Ожидается { "events": [ ... ] } (от 1 до 50 событий)',
    );
  }

  const results = await processBatch(batch.data.events);
  return jsonResponse({ results });
}
