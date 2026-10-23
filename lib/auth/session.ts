import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/auth";

export async function getSession() {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function getSessionFromRequest(req: Request) {
  return getAuth().api.getSession({ headers: req.headers });
}
