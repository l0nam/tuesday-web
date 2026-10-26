import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { claimOrders, listPluginOrderRecords } from "@/lib/economy/shop";

export async function GET(req: Request) {
  const auth = await verifyPluginRequest(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const view = url.searchParams.get("view");

  // Read-only queue/history for administrative display. Unlike the default
  // poll endpoint, this never claims orders or mutates their status.
  if (view === "queue" || view === "history") {
    const limit = Number(url.searchParams.get("limit") ?? 8);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return errorResponse(400, "bad_request", "limit: целое число от 1 до 100");
    }
    if (!Number.isInteger(offset) || offset < 0 || offset > 100_000) {
      return errorResponse(400, "bad_request", "offset: целое число от 0 до 100000");
    }
    const result = await listPluginOrderRecords(view, limit, offset);
    return jsonResponse({ view, ...result });
  }

  if (view !== null) {
    return errorResponse(400, "bad_request", 'view должен быть "queue" или "history"');
  }

  const limitParam = Number(url.searchParams.get("limit") ?? 20);
  if (!Number.isInteger(limitParam) || limitParam < 1 || limitParam > 100) {
    return errorResponse(400, "bad_request", "limit: целое число от 1 до 100");
  }

  const orders = await claimOrders(limitParam);
  return jsonResponse({ orders });
}
