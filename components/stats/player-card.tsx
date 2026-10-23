import Link from "next/link";
import { cn } from "cn";
import { PlayerHead } from "@/components/player/player-head";
import type { PlayerCardData } from "@/lib/stats/players";
import { formatHours } from "@/lib/utils/formatting";

export function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <Link
      href={`/players/${encodeURIComponent(player.name)}`}
      className="group flex items-center gap-4 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 transition outline-none hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="relative shrink-0">
        <PlayerHead
          nickname={player.name}
          size={48}
          className="size-12 rounded-md"
        />

        {player.online && (
          <span
            className={cn(
              "absolute -right-1 -bottom-1 size-3.5 rounded-full bg-primary ring-2 ring-card",
            )}
            title="Сейчас на сервере"
          >
            <span className="sr-only">Сейчас на сервере</span>
          </span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block truncate font-semibold transition-colors group-hover:text-primary">
          {player.name}
        </span>

        <span className="block truncate text-sm text-muted-foreground tabular-nums">
          Наиграл: {formatHours(player.seconds)} ч.
        </span>
      </span>
    </Link>
  );
}
