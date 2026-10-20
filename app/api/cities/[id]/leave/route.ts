import { badId, handleCityRequest, jsonResponse, parseId } from "@/lib/cities/api";
import { leaveCity } from "@/lib/cities/service";

/** Покинуть город. Владелец уйти не может. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cityId = parseId((await params).id);
  if (!cityId) return badId();

  return handleCityRequest(req, async (userId) => {
    await leaveCity(userId, cityId);
    return jsonResponse({ ok: true });
  });
}
