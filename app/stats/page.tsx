import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { after, connection } from "next/server";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { CopyIp } from "@/components/stats/copy-ip";
import { OnlineChart } from "@/components/stats/online-chart";
import { PlayerCard } from "@/components/stats/player-card";
import { PlayersToolbar } from "@/components/stats/players-toolbar";
import {
  ONLINE,
  fetchServerStatus,
  getOnlineHistory,
  recordOnlineSample,
} from "@/lib/stats/online";
import {
  PLAYERS_PER_PAGE,
  parsePlayersQuery,
  playersHref,
  type PlayersQuery,
} from "@/lib/stats/filters";
import { listPlayers } from "@/lib/stats/players";
import { pluralRu } from "@/lib/profile/stats";
import { siteTimezone } from "@/lib/utils/time";

export const metadata: Metadata = {
  title: "Статистика",
  description: "Онлайн сервера Tuesday и список игроков с наигранным временем.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function StatsPage({ searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-12 px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div
            className="h-104 animate-pulse rounded-2xl bg-card"
            aria-busy="true"
          />
        }
      >
        <ServerCard />
      </Suspense>

      <section id="players" className="scroll-mt-24 space-y-6">
        <h2 className="title text-3xl">Игроки</h2>
        <Suspense fallback={<PlayersFallback />}>
          <PlayersSection searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function ServerCard() {
  await connection();
  const status = await fetchServerStatus();
  after(() =>
    recordOnlineSample(status).catch((error) =>
      console.error("[stats] не удалось записать онлайн:", error),
    ),
  );
  const { points, now } = await getOnlineHistory();

  return (
    <div className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-4">
          <Image
            src="/images/logo.webp"
            width={96}
            height={96}
            alt="Логотип Tuesday"
            draggable={false}
            className="size-12 rounded-xl select-none sm:size-18"
          />
          <div className="flex flex-col items-start gap-2">
            <h1 className="title text-2xl leading-none sm:text-4xl">
              Статистика
            </h1>
            <CopyIp />
          </div>
        </div>

        <p
          className="ml-auto shrink-0 text-right"
          aria-label={
            status
              ? `Онлайн: ${status.players} из ${status.max}`
              : "Онлайн неизвестен"
          }
        >
          <span
            className={cn(
              "title text-3xl tabular-nums sm:text-5xl",
              status && !status.online && "text-muted-foreground",
            )}
          >
            {status ? (status.online ? status.players : 0) : "—"}
          </span>
          {status && status.max > 0 && (
            <span className="ml-1.5 text-muted-foreground tabular-nums">
              {" "}
              / {status.max}
            </span>
          )}
          <span className="mt-1 block text-xs text-muted-foreground">
            {status && !status.online ? "сервер выключен" : "игроков онлайн"}
          </span>
        </p>
      </header>

      <div className="mt-6">
        <OnlineChart
          points={points}
          now={now}
          stepMs={ONLINE.sampleMinutes * 60_000}
          timeZone={siteTimezone()}
        />
      </div>
    </div>
  );
}

function PlayersFallback() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-10 animate-pulse rounded-lg bg-card" />
      <GridFallback />
    </div>
  );
}

function GridFallback() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-22 animate-pulse rounded-xl bg-card" />
      ))}
    </div>
  );
}

async function PlayersSection({ searchParams }: Props) {
  const query = parsePlayersQuery(await searchParams);

  return (
    <>
      <PlayersToolbar query={query} />
      <Suspense key={JSON.stringify(query)} fallback={<GridFallback />}>
        <PlayersGrid query={query} />
      </Suspense>
    </>
  );
}

async function PlayersGrid({ query }: { query: PlayersQuery }) {
  await connection();
  const { players, total, page, pages } = await listPlayers(query);

  if (players.length === 0) {
    return (
      <p className="rounded-xl bg-card px-6 py-12 text-center text-muted-foreground ring-1 ring-foreground/10">
        {query.q || query.period !== "all"
          ? "Никого не нашли. Попробуйте изменить поиск или фильтр."
          : "Пока нет данных об игроках."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {players.map((player) => (
          <li key={player.name}>
            <PlayerCard player={player} />
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav
          aria-label="Страницы списка игроков"
          className="flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link
              href={playersHref({ ...query, page: page - 1 })}
              scroll={false}
              className={buttonVariants({ variant: "outline" })}
            >
              Назад
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground tabular-nums">
            Страница {page} из {pages} · {total}{" "}
            {pluralRu(total, "игрок", "игрока", "игроков")}
            <span className="sr-only">, по {PLAYERS_PER_PAGE} на странице</span>
          </p>
          {page < pages ? (
            <Link
              href={playersHref({ ...query, page: page + 1 })}
              scroll={false}
              className={buttonVariants({ variant: "outline" })}
            >
              Вперёд
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
