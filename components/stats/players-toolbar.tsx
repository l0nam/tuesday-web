"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  SortAscendingIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PERIODS,
  SEARCH_MAX_LENGTH,
  SORTS,
  playersHref,
  type Period,
  type PlayersQuery,
  type Sort,
} from "@/lib/stats/filters";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export function PlayersToolbar({ query }: { query: PlayersQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useOptimistic(query);
  const [text, setText] = useState(query.q);

  function go(next: PlayersQuery) {
    startTransition(() => {
      setView(next);
      router.replace(playersHref(next), { scroll: false });
    });
  }

  useEffect(() => {
    const value = text.trim();
    if (value === view.q) return;
    const timer = setTimeout(() => go({ ...view, q: value, page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [text, view]);

  const sort = SORTS.find((s) => s.key === view.sort) ?? SORTS[0];

  return (
    <div
      className="flex flex-col gap-3 lg:flex-row lg:items-center"
      aria-busy={pending}
    >
      <div className="relative lg:w-72">
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={text}
          maxLength={SEARCH_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="Поиск по нику..."
          aria-label="Поиск игрока по нику"
          className="pl-9 h-10"
        />
      </div>

      <Tabs>
        <TabsList aria-label="Период" className="h-10!">
          {PERIODS.map((p) => (
            <TabsTrigger
              key={p.key}
              value={p.key}
              aria-pressed={view.period === p.key}
              onClick={() => go({ ...view, period: p.key as Period, page: 1 })}
            >
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "justify-between gap-2 px-3 font-normal",
          )}
        >
          <span className="flex items-center gap-2">
            <SortAscendingIcon className="size-4" />
            <span className="text-muted-foreground">Сортировка:</span>{" "}
            {sort.label.replace(/^Наигранное время: /, "Время: ")}
          </span>
          <CaretDownIcon className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuRadioGroup
            value={view.sort}
            onValueChange={(value) =>
              go({ ...view, sort: value as Sort, page: 1 })
            }
          >
            {SORTS.map((s) => (
              <DropdownMenuRadioItem key={s.key} value={s.key} closeOnClick>
                {s.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
