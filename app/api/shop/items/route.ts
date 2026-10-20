import { jsonResponse } from "@/lib/utils/http";
import { listShopItems } from "@/lib/economy/shop";

/** Каталог магазина. Команды выдачи наружу не отдаются. */
export async function GET() {
  const items = await listShopItems();
  return jsonResponse({ items });
}
