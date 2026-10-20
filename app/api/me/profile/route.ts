import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { player } from "@/lib/db/schema";
import { checkSameOrigin, errorResponse, jsonResponse } from "@/lib/utils/http";
import { ensurePlayer } from "@/lib/player";
import { normalizeBio } from "@/lib/profile/bio";
import { PROFILE } from "@/lib/profile/config";
import { getSessionFromRequest } from "@/lib/auth/session";

const MAX_BODY_BYTES = 64 * 1024;

const bodySchema = z
  .object({
    bio: z.string().optional(),
    showDiscord: z.boolean().optional(),
  })
  .strict()
  .refine((b) => b.bio !== undefined || b.showDiscord !== undefined, {
    message: "Нечего сохранять",
  });

export async function PUT(req: Request) {
  const badOrigin = checkSameOrigin(req);
  if (badOrigin) return badOrigin;

  const session = await getSessionFromRequest(req);
  if (!session)
    return errorResponse(
      401,
      "unauthorized",
      "Войдите, чтобы редактировать профиль",
    );

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES)
    return errorResponse(413, "too_large", "Слишком большой запрос");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return errorResponse(400, "bad_json", "Некорректный JSON");
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success)
    return errorResponse(
      400,
      "bad_request",
      parsed.error.issues[0]?.message ?? "Некорректные данные",
    );

  const current = await ensurePlayer(session.user.id);
  if (!current)
    return errorResponse(
      409,
      "no_discord",
      "К аккаунту не привязан Discord. Войдите через Discord заново.",
    );

  const changes: Partial<
    Pick<typeof player.$inferInsert, "bio" | "showDiscord">
  > = {};
  if (parsed.data.bio !== undefined) {
    const bio = normalizeBio(parsed.data.bio, PROFILE.bioMaxLength);
    if (!bio.ok) return errorResponse(400, "bad_bio", bio.error);
    changes.bio = bio.value;
  }
  if (parsed.data.showDiscord !== undefined)
    changes.showDiscord = parsed.data.showDiscord;

  await db
    .update(player)
    .set(changes)
    .where(eq(player.userId, session.user.id));

  return jsonResponse({
    ok: true,
    bio: changes.bio !== undefined ? changes.bio : current.bio,
    showDiscord: changes.showDiscord ?? current.showDiscord,
  });
}
