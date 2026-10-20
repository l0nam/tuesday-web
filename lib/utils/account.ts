import type { SyncResult } from "@/lib/player";
import { formatUuid } from "@/lib/minecraft/uuid";

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
  /** linked - привязан; not_linked - нужно привязать Discord к игровому аккаунту; unavailable - БД DiscordSRV недоступна */
  link: SyncResult["link"];
  /** Сколько Вторничков, набранных до привязки, зачислено только что */
  claimed: SyncResult["claimed"];
}

export function toAccountPayload(
  user: { id: string; name: string; image?: string | null },
  sync: SyncResult,
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
  };
}
