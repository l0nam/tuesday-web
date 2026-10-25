import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { CityGrid } from "@/components/cities/city-grid";
import { getSession } from "@/lib/auth/session";
import { getMembership, listCities } from "@/lib/cities/queries";

export const metadata: Metadata = {
  title: "Кланы",
  description: "Кланы сервера Tuesday: найдите свой или создайте новый.",
};

export default function CitiesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <Suspense fallback={<CitiesFallback />}>
        <CitiesContent />
      </Suspense>
    </main>
  );
}

function CitiesFallback() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-24 animate-pulse rounded-xl bg-card" />
      <div className="h-12 animate-pulse rounded-xl bg-card" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    </div>
  );
}

async function CitiesContent() {
  const session = await getSession();
  const userId = session?.user.id ?? null;

  const [cities, membership] = await Promise.all([
    listCities(),
    userId ? getMembership(userId) : null,
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="title text-4xl sm:text-5xl">Кланы</h1>
          <p className="mt-3 text-pretty text-muted-foreground">
            Сообщества игроков Tuesday. Подайте заявку в открытый клан или
            создайте свой: у каждого игрока может быть один клан.
          </p>
        </div>

        {membership ? (
          <Link
            href={`/clans/${membership.cityId}`}
            className={cn(buttonVariants({ size: "lg" }))}
          >
            <BuildingsIcon weight="bold" />
            Мой клан: {membership.cityName}
          </Link>
        ) : (
          <Link
            href="/clans/new"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            <PlusIcon weight="bold" />
            Создать клан
          </Link>
        )}
      </header>

      <CityGrid cities={cities} />
    </div>
  );
}
