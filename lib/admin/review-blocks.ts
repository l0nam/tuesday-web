import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminReviewBlock } from "@/lib/db/schema";

export async function isReviewSubmissionBlocked(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: adminReviewBlock.userId })
    .from(adminReviewBlock)
    .where(eq(adminReviewBlock.userId, userId))
    .limit(1);
  return Boolean(row);
}
