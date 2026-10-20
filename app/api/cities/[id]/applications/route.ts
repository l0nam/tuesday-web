import { z } from "zod";
import { badId, handleCityRequest, jsonResponse, parseId, readBody } from "@/lib/cities/api";
import { applyToCity, cancelApplication } from "@/lib/cities/service";

const bodySchema = z.object({ message: z.string().max(2000).nullish() });

/** Подать заявку на вступление в город. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cityId = parseId((await params).id);
  if (!cityId) return badId();

  return handleCityRequest(req, async (userId) => {
    const body = await readBody(req, bodySchema);
    if (!body.ok) return body.response;
    await applyToCity(userId, cityId, body.data.message);
    return jsonResponse({ ok: true }, 201);
  });
}

/** Отозвать свою заявку. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cityId = parseId((await params).id);
  if (!cityId) return badId();

  return handleCityRequest(req, async (userId) => {
    await cancelApplication(userId, cityId);
    return jsonResponse({ ok: true });
  });
}
