import { jsonResponse } from "@/lib/utils/http";
import { listShopItems } from "@/lib/economy/shop";

export async function GET() {
  const items = await listShopItems();
  return jsonResponse({ items });
}
