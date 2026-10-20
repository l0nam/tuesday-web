import { z } from "zod";
import { errorResponse, jsonResponse } from "@/lib/utils/http";
import { verifyPluginRequest } from "@/lib/plugin/plugin-auth";
import { completeOrder } from "@/lib/economy/shop";

const bodySchema = z.object({
  status: z.enum(["delivered", "failed"]),
  reason: z.string().max(255).optional(),
});

/** Плагин подтверждает итог выдачи заказа. При status="failed" Вторнички возвращаются игроку. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyPluginRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) return errorResponse(400, "bad_request", "Некорректный id заказа");

  let json: unknown;
  try {
    json = JSON.parse(auth.body);
  } catch {
    return errorResponse(400, "bad_json", "Тело запроса не является JSON");
  }
  const body = bodySchema.safeParse(json);
  if (!body.success) return errorResponse(400, "bad_request", 'Ожидается { "status": "delivered" | "failed", "reason"?: string }');

  const result = await completeOrder(orderId, body.data.status, body.data.reason);
  switch (result) {
    case "ok":
    case "already":
      return jsonResponse({ result });
    case "not_found":
      return errorResponse(404, "not_found", "Заказ не найден");
    case "conflict":
      return errorResponse(409, "conflict", "Заказ уже закрыт с другим результатом");
  }
}
