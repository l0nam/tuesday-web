import { and, eq, ne } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { account, player, type Player } from "@/lib/db/schema";
import { lookupLinkedAccount } from "@/lib/discordsrv";
import { resolveName } from "@/lib/minecraft/mojang";
import { claimPendingRewards } from "@/lib/economy/wallet";

const LINK_CHECK_INTERVAL_MS = 60_000;
const LINK_CHECK_FORCE_INTERVAL_MS = 5_000;

export type LinkState = "linked" | "not_linked" | "unavailable";

export interface SyncResult {
  player: Player;
  link: LinkState;
  claimed: { count: number; total: number };
}

export async function getPlayer(userId: string): Promise<Player | null> {
  const [row] = await db
    .select()
    .from(player)
    .where(eq(player.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function ensurePlayer(
  userId: string,
  discordId?: string,
): Promise<Player | null> {
  const existing = await getPlayer(userId);
  if (existing) return existing;

  let id = discordId;
  if (!id) {
    const [acc] = await db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "discord")))
      .limit(1);
    id = acc?.accountId;
  }
  if (!id) return null;

  await db.insert(player).ignore().values({ userId, discordId: id });
  return getPlayer(userId);
}

export async function syncLink(
  userId: string,
  opts: { force?: boolean } = {},
): Promise<SyncResult | null> {
  const current = await ensurePlayer(userId);
  if (!current) return null;

  const noClaim = { count: 0, total: 0 };
  const minInterval = opts.force
    ? LINK_CHECK_FORCE_INTERVAL_MS
    : LINK_CHECK_INTERVAL_MS;
  const fresh =
    current.linkCheckedAt &&
    Date.now() - current.linkCheckedAt.getTime() < minInterval;
  if (fresh) {
    return {
      player: current,
      link: current.mcUuid ? "linked" : "not_linked",
      claimed: noClaim,
    };
  }

  const found = await lookupLinkedAccount(current.discordId);
  if (found.state === "unavailable") {
    return { player: current, link: "unavailable", claimed: noClaim };
  }

  const now = new Date();

  if (found.state === "not_linked") {
    await db
      .update(player)
      .set({ mcUuid: null, mcName: null, linkedAt: null, linkCheckedAt: now })
      .where(eq(player.userId, userId));
    return {
      player: (await getPlayer(userId)) ?? current,
      link: "not_linked",
      claimed: noClaim,
    };
  }

  const uuid = found.mcUuid;
  const name =
    current.mcUuid === uuid && current.mcName
      ? current.mcName
      : await resolveName(uuid);

  await withTransaction(async (tx) => {
    await tx
      .update(player)
      .set({ mcUuid: null, mcName: null, linkedAt: null })
      .where(and(eq(player.mcUuid, uuid), ne(player.userId, userId)));
    await tx
      .update(player)
      .set({
        mcUuid: uuid,
        mcName: name,
        linkedAt: current.mcUuid === uuid ? current.linkedAt : now,
        linkCheckedAt: now,
      })
      .where(eq(player.userId, userId));
  });

  const claimed = await claimPendingRewards(userId, uuid);
  return {
    player: (await getPlayer(userId)) ?? current,
    link: "linked",
    claimed,
  };
}
