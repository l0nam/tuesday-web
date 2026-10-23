import { db } from "@/lib/db";
import { adminAudit } from "@/lib/db/schema";

export async function writeAdminAudit(input: {
  actorUserId: string;
  action: string;
  targetUserId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await db.insert(adminAudit).values({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId ?? null,
    action: input.action.slice(0, 80),
    meta: input.meta ?? null,
  });
}
