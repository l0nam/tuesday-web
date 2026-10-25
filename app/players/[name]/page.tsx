import { Suspense } from "react";
import type { Metadata } from "next";
import { cache } from "react";
import { findUuidByName } from "@/lib/profile/data";
import { PlayerProfile } from "@/components/player/profile";

type Props = {
  params: Promise<{ name: string }>;
  fromStats?: boolean;
};

const lookupName = cache(findUuidByName);

function readName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = readName((await params).name);
  const found = await lookupName(name);

  return {
    title: found ? `${found.name}: профиль игрока` : "Игрок не найден",
    description: found
      ? `Профиль игрока ${found.name} на сервере Tuesday: статистика, клан и описание.`
      : undefined,
  };
}

export default function PlayerPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense
        fallback={
          <div className="py-24 text-center text-sm text-muted-foreground">
            Загрузка профиля...
          </div>
        }
      >
        <PlayerRoute params={params} fromStats={true} />
      </Suspense>
    </main>
  );
}

async function PlayerRoute({ params, fromStats }: Props) {
  const name = readName((await params).name);

  return <PlayerProfile name={name} fromStats={fromStats} />;
}
