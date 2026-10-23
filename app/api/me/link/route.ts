import { toAccountPayload } from "@/lib/utils/account";
import { checkSameOrigin, errorResponse, jsonResponse } from "@/lib/utils/http";
import { syncLink } from "@/lib/player";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getAccountContext } from "@/lib/utils/account-context";

export async function POST(req: Request) {
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;

  const session = await getSessionFromRequest(req);
  if (!session) {
    return errorResponse(401, "unauthorized", "Войдите через Discord");
  }
  const sync = await syncLink(session.user.id, { force: true });
  if (!sync) {
    return errorResponse(
      409,
      "no_discord",
      "К аккаунту не привязан Discord. Войдите через Discord заново.",
    );
  }

  const context = await getAccountContext(session.user.id);
  return jsonResponse(toAccountPayload(session.user, sync, context));
}
