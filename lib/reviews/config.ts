import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { player, serverReview, user } from "@/lib/db/schema";

export type PublicReview = {
  id: number;
  nick: string;
  text: string;
  rating: number;
};

export type OwnReview = {
  id: number;
  text: string;
  rating: number;
  createdAt: Date;
} | null;

export async function getPublicReviews(
  limit?: number,
): Promise<PublicReview[]> {
  const query = db
    .select({
      id: serverReview.id,
      text: serverReview.text,
      rating: serverReview.rating,
      name: user.name,
      mcName: player.mcName,
    })
    .from(serverReview)
    .innerJoin(user, eq(user.id, serverReview.userId))
    .leftJoin(player, eq(player.userId, serverReview.userId));

  const orderBy = [
    desc(serverReview.createdAt),
    desc(serverReview.id),
  ] as const;

  const rows =
    limit === undefined
      ? await query.orderBy(...orderBy)
      : await query.orderBy(...orderBy).limit(limit);

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    rating: row.rating,
    nick: row.mcName ?? row.name,
  }));
}

export async function getOwnReview(userId: string): Promise<OwnReview> {
  const [row] = await db
    .select({
      id: serverReview.id,
      text: serverReview.text,
      createdAt: serverReview.createdAt,
      rating: serverReview.rating,
    })
    .from(serverReview)
    .where(eq(serverReview.userId, userId))
    .limit(1);

  return row ?? null;
}
