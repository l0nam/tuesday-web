import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/components/auth/sign-in-button";
import { syncLink } from "@/lib/player";
import { getSession } from "@/lib/auth/session";
import { listShopItems } from "@/lib/economy/shop";
import { BuyButton } from "./buy-button";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { formatNumber, formatCurrency } from "@/lib/utils/formatting";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Магазин" };

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh justify-center items-center w-full text-muted-foreground">
          Загружаем магазин...
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

async function ShopContent() {
  const session = await getSession();
  const sync = session ? await syncLink(session.user.id) : null;
  const items = await listShopItems();

  const balance = sync?.player.balance ?? null;
  const linked = Boolean(sync?.player.mcUuid);

  return (
    <main className="mx-auto w-full min-h-svh max-w-6xl flex flex-col justify-center space-y-8 px-4 py-25 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col">
          <Link
            href="/#reviews"
            className="mb-6 inline-flex gap-2.5 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretLeftIcon weight="bold" className="mt-0.5" /> На главную
          </Link>

          <h1 className="text-3xl title mt-3">Магазин</h1>
          <p className="mt-1 text-muted-foreground">
            Обменивайте Вторнички на предметы. Большинство товаров выдаётся
            автоматически, некоторые требуют подтверждения администрации.
          </p>

          <p className="mt-1 text-sm text-amber-400 max-w-xl">
            Если товар не выдался автоматически, подождите пока Администрация
            подтвердит покупку или обратитесь за помощью.
          </p>
        </div>

        {balance !== null && (
          <Link
            href="/profile"
            className="rounded-xl border bg-card px-5 py-3 text-right transition hover:bg-muted"
          >
            <span className="block text-xs text-muted-foreground">
              Ваш баланс
            </span>
            <span className="text-xl tabular-nums">
              {formatNumber(balance, true)} {formatCurrency(balance, true)}
            </span>
          </Link>
        )}
      </header>

      {!session && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
          <p className="text-sm">Войдите через Discord, чтобы покупать.</p>
          <SignInButton callbackURL="/shop" />
        </div>
      )}

      {session && !linked && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border  bg-card p-5">
          <p className="text-sm">
            Чтобы покупать, привяжите Discord к игровому аккаунту.
          </p>
          <Link
            href="/profile"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Как привязать
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground">Товаров пока нет.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const soldOut = item.stock !== null && item.stock <= 0;
            let disabledReason: string | undefined;
            if (!session) disabledReason = "Нужно войти";
            else if (!linked)
              disabledReason = "Нужна привязка игрового аккаунта";
            else if (soldOut) disabledReason = "Нет в наличии";
            else if (balance !== null && balance < item.price)
              disabledReason = `Не хватает ${item.price - balance}`;

            return (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{item.name}</CardTitle>
                  {item.description && (
                    <CardDescription>{item.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent>
                  <p className="text-2xl tabular-nums font-semibold">
                    {formatNumber(item.price)}{" "}
                    <span className="text-muted-foreground font-normal text-lg">
                      {formatCurrency(item.price)}
                    </span>
                  </p>

                  {item.stock !== null && !soldOut && (
                    <p>Осталось: {item.stock}</p>
                  )}
                </CardContent>

                <CardFooter className="mt-auto inline-flex w-full">
                  <BuyButton
                    itemId={item.id}
                    price={item.price}
                    disabledReason={disabledReason}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </ul>
      )}
    </main>
  );
}
