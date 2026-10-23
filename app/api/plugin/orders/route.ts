import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { claimOrders } from "@/lib/economy/shop";

export async function GET(req: Request) {
  const auth = await verifyPluginRequest(req);
  if (!auth.ok) return auth.response;

  const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  if (!Number.isInteger(limitParam) || limitParam < 1 || limitParam > 100) {
    return errorResponse(400, "bad_request", "limit: целое число от 1 до 100");
  }

  const orders = await claimOrders(limitParam);
  return jsonResponse({ orders });
}
