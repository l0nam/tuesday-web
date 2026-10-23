import { desc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { player, user } from "@/lib/db/schema";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { jsonResponse } from "@/lib/utils/http";

export async function GET(req: Request) {
  const access = await authorizeAdminRequest(req, "players.read");
  if (!access.ok) return access.response;
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 64) ?? "";
  const rows = await db
    .select({ userId: user.id, name: user.name, image: user.image, createdAt: user.createdAt, discordId: player.discordId, mcName: player.mcName, mcUuid: player.mcUuid, balance: player.balance, linkedAt: player.linkedAt })
    .from(user)
    .innerJoin(player, eq(player.userId, user.id))
    .where(q ? or(like(user.name, `%${q}%`), like(player.mcName, `%${q}%`), like(player.discordId, `%${q}%`)) : undefined)
    .orderBy(desc(player.balance))
    .limit(100);
  return jsonResponse({ players: rows, permissions: [...access.permissions] });
}
