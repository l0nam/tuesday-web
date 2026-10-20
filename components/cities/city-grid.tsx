"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerHead } from "@/components/player/player-head";
import { BannerView } from "@/components/cities/banner";
import type { Banner } from "@/lib/cities/banner";
import { pluralRu } from "@/lib/profile/stats";

export interface CityCardData {
  id: number;
  name: string;
  description: string | null;
  banner: Banner;
  members: number;
  recruiting: boolean;
  hasDiscord: boolean;
  ownerName: string;
  ownerMcName: string | null;
}

export function RecruitingBadge({ recruiting, className }: { recruiting: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", recruiting ? "text-primary" : "text-muted-foreground", className)}>
      <span className={cn("size-2 rounded-full", recruiting ? "bg-primary shadow-[0_0_8px] shadow-primary/70" : "bg-muted-foreground/60")} />
      {recruiting ? "Идёт набор" : "Набор закрыт"}
    </span>
  );
}

function CityCard({ city }: { city: CityCardData }) {
  return (
    <Link
      href={`/cities/${city.id}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <Card className="h-full transition group-hover:ring-primary/40">
        <div className="flex h-full items-start justify-between gap-4 px-(--card-spacing)">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PlayerHead nickname={city.ownerMcName} size={24} className="size-6 rounded-sm" />
              <span className="truncate">{city.ownerName}</span>
            </span>

            <h2 className="title text-2xl transition-colors group-hover:text-primary">{city.name}</h2>

            <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
              {city.description ?? "Описание пока не добавлено"}
            </p>

            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <span className="size-1.5 bg-foreground/60" />
                <span className="tabular-nums">
                  {city.members} {pluralRu(city.members, "житель", "жителя", "жителей")}
                </span>
              </li>
              {city.hasDiscord && (
                <li className="flex items-center gap-2">
                  <span className="size-1.5 bg-foreground/60" />
                  Есть Discord сервер
                </li>
              )}
              <li>
                <RecruitingBadge recruiting={city.recruiting} />
              </li>
            </ul>
          </div>

          <BannerView banner={city.banner} className="w-20 transition group-hover:-translate-y-0.5" label={`Флаг города ${city.name}`} />
        </div>
      </Card>
    </Link>
  );
}

export function CityGrid({ cities }: { cities: CityCardData[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ru-RU");
    if (!q) return cities;
    return cities.filter((c) => [c.name, c.ownerName, c.description ?? ""].some((s) => s.toLocaleLowerCase("ru-RU").includes(q)));
  }, [cities, query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию, владельцу или описанию..."
          aria-label="Поиск городов"
          className="h-12 pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {cities.length === 0 ? "Городов пока нет. Станьте первым: создайте свой." : "Ничего не найдено."}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((city) => (
            <li key={city.id} className="h-full">
              <CityCard city={city} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
