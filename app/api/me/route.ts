import { toAccountPayload } from "@/lib/utils/account";
import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { syncLink } from "@/lib/player";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return jsonResponse({ authenticated: false });

  const sync = await syncLink(session.user.id);
  if (!sync) {
    return errorResponse(
      409,
      "no_discord",
      "К аккаунту не привязан Discord. Войдите через Discord заново.",
    );
  }
  return jsonResponse(toAccountPayload(session.user, sync));
}
