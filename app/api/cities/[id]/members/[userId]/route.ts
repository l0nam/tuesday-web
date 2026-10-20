import { z } from "zod";
import { badId, handleCityRequest, jsonResponse, parseId, readBody } from "@/lib/cities/api";
import { removeMember, setMemberRole } from "@/lib/cities/service";

const bodySchema = z.object({ role: z.enum(["coowner", "member"]) });

/** Назначить совладельцем или снять с этой роли (только владелец). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: targetUserId } = await params;
  const cityId = parseId(id);
  if (!cityId || !targetUserId || targetUserId.length > 36) return badId();

  return handleCityRequest(req, async (userId) => {
    const body = await readBody(req, bodySchema);
    if (!body.ok) return body.response;
    await setMemberRole(userId, cityId, targetUserId, body.data.role);
    return jsonResponse({ ok: true });
  });
}

/** Исключить жителя из города. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: targetUserId } = await params;
  const cityId = parseId(id);
  if (!cityId || !targetUserId || targetUserId.length > 36) return badId();

  return handleCityRequest(req, async (userId) => {
    await removeMember(userId, cityId, targetUserId);
    return jsonResponse({ ok: true });
  });
}
