import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { player, serverReview, user } from "@/lib/db/schema";

import { SERVER_REVIEW_MAX_LENGTH, SERVER_REVIEW_MIN_LENGTH } from "@/lib/reviews/config";

export { SERVER_REVIEW_MAX_LENGTH, SERVER_REVIEW_MIN_LENGTH } from "@/lib/reviews/config";

export type PublicReview = {
  id: number;
  nick: string;
  text: string;
};

export type OwnReview = {
  id: number;
  text: string;
  createdAt: Date;
} | null;

/** Отзывы публичной секции. Ник берётся из привязанного Minecraft-аккаунта. */
export async function getPublicReviews(): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: serverReview.id,
      text: serverReview.text,
      userName: user.name,
      mcName: player.mcName,
    })
    .from(serverReview)
    .innerJoin(user, eq(user.id, serverReview.userId))
    .leftJoin(player, eq(player.userId, serverReview.userId))
    .orderBy(desc(serverReview.createdAt), desc(serverReview.id));

  return rows.map((row) => ({
    id: row.id,
    nick: row.mcName?.trim() || row.userName,
    text: row.text,
  }));
}

export async function getOwnReview(userId: string): Promise<OwnReview> {
  const [row] = await db
    .select({
      id: serverReview.id,
      text: serverReview.text,
      createdAt: serverReview.createdAt,
    })
    .from(serverReview)
    .where(eq(serverReview.userId, userId))
    .limit(1);

  return row ?? null;
}
