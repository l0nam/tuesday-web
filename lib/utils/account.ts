import type { SyncResult } from "@/lib/player";
import { formatUuid } from "./formatting";
import type { AccountContext } from "@/lib/utils/account-context";

export interface AccountPayload {
  authenticated: true;
  user: { id: string; name: string; image: string | null };
  player: {
    discordId: string;
    balance: number;
    mcLinked: boolean;
    mcUuid: string | null;
    mcName: string | null;
  };
  link: SyncResult["link"];
  claimed: SyncResult["claimed"];
  city: AccountContext["city"];
  canAccessAdmin: boolean;
}

export function toAccountPayload(
  user: { id: string; name: string; image?: string | null },
  sync: SyncResult,
  context: AccountContext,
): AccountPayload {
  const p = sync.player;
  return {
    authenticated: true,
    user: { id: user.id, name: user.name, image: user.image ?? null },
    player: {
      discordId: p.discordId,
      balance: p.balance,
      mcLinked: p.mcUuid !== null,
      mcUuid: p.mcUuid ? formatUuid(p.mcUuid) : null,
      mcName: p.mcName,
    },
    link: sync.link,
    claimed: sync.claimed,
    city: context.city,
    canAccessAdmin: context.canAccessAdmin,
  };
}
