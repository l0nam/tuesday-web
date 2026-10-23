"use client";

import Link from "next/link";
import { cn } from "cn";
import { Button, buttonVariants } from "../ui/button";
import { Section } from "../ui/section";
import {
  ArrowRightIcon,
  ChatsCircleIcon,
  CheckIcon,
  ClockIcon,
  TrophyIcon,
  UsersThreeIcon,
  WalletIcon,
  type Icon,
} from "@phosphor-icons/react";
import { formatNumber, formatCurrency } from "@/lib/utils/formatting";

const POINTS = [
  "Баланс привязан к вашему игровому аккаунту",
  "Валюту можно обменять на предметы в магазине",
];

const EARN: { icon: Icon; label: string }[] = [
  { icon: TrophyIcon, label: "Достижения в игре" },
  { icon: UsersThreeIcon, label: "Община от 10 человек" },
  { icon: ClockIcon, label: "Наигранное время" },
  { icon: ChatsCircleIcon, label: "Жизнь сервера" },
];

type WalletCardProps = {
  balance: number | null;
  shopHref: string;
  onAuthClick?: () => void;
};

function WalletCard({ balance, shopHref, onAuthClick }: WalletCardProps) {
  const authorized = balance !== null;

  return (
    <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-inset ring-foreground/10">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-[at_60%_100%] from-lime-200 via-green-500 to-emerald-700" />

        <div className="relative flex min-h-40 flex-col justify-between gap-6 p-6 text-background dark sm:min-h-44">
          <WalletIcon className="size-6.5" weight="bold" />

          {authorized ? (
            <div>
              <p className="text-sm font-medium opacity-70">Баланс кошелька</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
                <span className="title text-4xl tabular-nums sm:text-5xl">
                  {formatNumber(balance)}
                </span>
                <span className="text-lg font-medium opacity-70">
                  {formatCurrency(balance)}
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium opacity-70">
                За что дают Вторнички
              </p>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                {EARN.map(({ icon: EarnIcon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2.5 rounded-xl bg-foreground/20 px-3 py-2.5 text-sm font-medium leading-snug"
                  >
                    <EarnIcon className="size-5 shrink-0" weight="bold" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 p-6">
        {authorized ? (
          <>
            <div>
              <h3 className="title text-lg">На что потратить</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                Обменивайте Вторнички на предметы в магазине сервера. Чем
                активнее вы играете, тем больше можно получить.
              </p>
            </div>

            <Link
              href={shopHref}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Перейти в магазин
              <ArrowRightIcon weight="bold" />
            </Link>
          </>
        ) : (
          <>
            <div>
              <h3 className="title text-lg">Войдите, чтобы пользоваться</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                После входа вы увидите свой баланс и сможете тратить Вторнички в
                магазине сервера.
              </p>
            </div>

            <Button size="lg" className="w-full" onClick={onAuthClick}>
              Авторизоваться
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function WalletSection({
  balance = null,
  shopHref = "/shop",
  onAuthClick,
}: {
  balance?: number | null;
  shopHref?: string;
  onAuthClick?: () => void;
}) {
  return (
    <Section id="wallet">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2 className="title text-3xl md:text-4xl">Кошелёк прямо на сайте</h2>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Получайте Вторнички за достижения в игре, создание общины минимум на
            10 человек, наигранное время на сервере и участие в общественной
            жизни сервера.
          </p>

          <ul className="mt-8 space-y-4.5">
            {POINTS.map((point) => (
              <li
                key={point}
                className="flex place-items-center gap-3 text-muted-foreground"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/20 text-primary">
                  <CheckIcon className="size-3.5" weight="bold" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-end">
          <WalletCard
            balance={balance}
            shopHref={shopHref}
            onAuthClick={onAuthClick}
          />
        </div>
      </div>
    </Section>
  );
}
