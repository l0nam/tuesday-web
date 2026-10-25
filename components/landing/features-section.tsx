"use client";

import { cn } from "cn";
import { Section, SectionHeading } from "../ui/section";
import {
  ArrowClockwiseIcon,
  ChartBarIcon,
  CubeIcon,
  ShieldIcon,
  UsersThreeIcon,
  BuildingsIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

type Feature = {
  icon: Icon;
  title: string;
  text: string;
};

const FEATURES: Feature[] = [
  {
    icon: CubeIcon,
    title: "Полуванильное выживание",
    text: "Мы добавляем интересные механики и сюжет на наш сервер чтобы сделать игру еще интереснее. Однако выживание и творчество остаются главными.",
  },
  {
    icon: BuildingsIcon,
    title: "Кланы",
    text: "Объединяйтесь с другими игроками и развивайте свои города вместе. У каждого клана есть страница на сайте.",
  },
  {
    icon: ChartBarIcon,
    title: "Статистика и рейтинг",
    text: "Наигранные часы и рейтинг игроков собраны на странице статистики.",
  },
  {
    icon: ArrowClockwiseIcon,
    title: "Актуальная версия",
    text: "Сервер работает на свежей версии игры, чтобы вы не отставали от обновлений.",
  },
  {
    icon: ShieldIcon,
    title: "Единый аккаунт",
    text: "Авторизуйтесь на сайте один раз и пользуйтесь профилем, статистикой и кошельком.",
  },
  {
    icon: UsersThreeIcon,
    title: "Лучшее комьюнити",
    text: "У нас играют отзывчивые и доброжелательные люди, которые всегда рады помочь.",
  },
];

const SHADES = [
  "bg-primary/5",
  "bg-primary/10",
  "bg-primary/20",
  "bg-primary/40",
];

function BlockPattern() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-6 top-6 hidden grid-cols-8 gap-1 md:grid"
    >
      {Array.from({ length: 32 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-6 rounded",
            SHADES[(i * 5 + Math.floor(i / 8) * 3) % SHADES.length],
          )}
        />
      ))}
    </div>
  );
}

export function FeaturesSection() {
  return (
    <Section id="features">
      <SectionHeading
        title="Что вас ждёт на сервере"
        description="Всё, что нужно для спокойной игры и общения, в одном месте."
      />

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => {
          const big = i === 0;
          return (
            <li
              key={title}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl bg-card p-6 ring-1 ring-inset ring-foreground/10 transition-colors duration-500 hover:ring-foreground/20 sm:p-8",
                big && "md:col-span-2 lg:row-span-2 lg:min-h-80",
                "md:last:col-span-2 lg:last:col-span-1",
              )}
            >
              <span className="grid size-11 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5.5" weight="bold" />
              </span>

              <div className={big ? "mt-5 md:mt-auto md:pt-12" : "mt-5"}>
                <h3 className={cn("title text-xl", big && "sm:text-2xl")}>
                  {title}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-pretty leading-relaxed text-muted-foreground",
                    big
                      ? "max-w-sm text-base sm:text-lg"
                      : "text-sm sm:text-base",
                  )}
                >
                  {text}
                </p>
              </div>
              {big && <BlockPattern />}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
