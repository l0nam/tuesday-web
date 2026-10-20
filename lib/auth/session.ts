import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/auth";

/**
 * Сессия для серверных компонентов и server actions.
 * headers() вызывается ПЕРВЫМ: это помечает страницу динамической до того, как читаются
 * переменные окружения, поэтому `next build` не пытается пререндерить страницы и не требует секретов.
 */
export async function getSession() {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

/** Сессия для route handlers. */
export async function getSessionFromRequest(req: Request) {
  return getAuth().api.getSession({ headers: req.headers });
}
