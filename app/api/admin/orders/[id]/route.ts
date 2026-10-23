import { and, eq, inArray } from "drizzle-orm";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { completeOrder } from "@/lib/economy/shop";
import { db } from "@/lib/db";
import { shopOrder } from "@/lib/db/schema";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

const STATUSES = ["pending", "processing", "delivered", "failed"] as const;
type OrderStatus = (typeof STATUSES)[number];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  const access = await authorizeAdminRequest(req, "orders.manage", {
    mutation: true,
  });

  if (!access.ok) return access.response;

  const { id: rawId } = await params;
  const orderId = Number(rawId);

  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(orderId) || orderId < 1) {
    return errorResponse(400, "invalid_order_id", "Некорректный ID заказа");
  }

  let body: { status?: unknown; reason?: unknown };

  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Некорректный JSON");
  }

  if (
    typeof body.status !== "string" ||
    !(STATUSES as readonly string[]).includes(body.status)
  ) {
    return errorResponse(400, "invalid_status", "Некорректный статус заказа");
  }

  const status = body.status as OrderStatus;
  const reason =
    typeof body.reason === "string" ? body.reason.trim().slice(0, 255) : "";

  try {
    if (status === "delivered" || status === "failed") {
      const result = await completeOrder(
        orderId,
        status,
        status === "failed"
          ? reason || "Статус изменён администратором"
          : undefined,
      );

      if (result === "not_found") {
        return errorResponse(404, "order_not_found", "Заказ не найден");
      }

      if (result === "conflict") {
        return errorResponse(
          409,
          "order_already_completed",
          "Завершённый заказ нельзя перевести в другой статус",
        );
      }

      return jsonResponse({ success: true, status });
    }

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .select({ status: shopOrder.status })
        .from(shopOrder)
        .where(eq(shopOrder.id, orderId))
        .for("update");

      if (!order) return "not_found" as const;

      if (order.status === "delivered" || order.status === "failed") {
        return "conflict" as const;
      }

      if (order.status === status) return "already" as const;

      await tx
        .update(shopOrder)
        .set({
          status,
          claimedAt: status === "processing" ? new Date() : null,
          failReason: null,
          completedAt: null,
        })
        .where(
          and(
            eq(shopOrder.id, orderId),
            inArray(shopOrder.status, ["pending", "processing"]),
          ),
        );

      return "ok" as const;
    });

    if (result === "not_found") {
      return errorResponse(404, "order_not_found", "Заказ не найден");
    }

    if (result === "conflict") {
      return errorResponse(
        409,
        "order_already_completed",
        "Завершённый заказ нельзя изменить",
      );
    }

    return jsonResponse({ success: true, status });
  } catch {
    return errorResponse(
      500,
      "order_update_failed",
      "Не удалось изменить статус заказа",
    );
  }
}
