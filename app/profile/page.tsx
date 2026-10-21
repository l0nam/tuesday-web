import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInButton } from "@/components/auth/sign-in-button";
import { getSession } from "@/lib/auth/session";
import { syncLink } from "@/lib/player";
import {
  PlayerProfile,
  PlayerProfileFallback,
} from "@/components/player/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "cn";
import { LINKS } from "@/lib/data";
import { LinkStatus } from "./link-status";
import { ReviewForm } from "@/components/reviews/review-form";

export const metadata: Metadata = {
  title: "Профиль",
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24">
          <p className="text-sm text-muted-foreground">Загрузка профиля...</p>
        </main>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-lg min-h-svh justify-center flex-col items-center gap-5 px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Профиль</h1>
        <p className="text-muted-foreground">
          Войдите через Discord, чтобы увидеть свой профиль.
        </p>
        <SignInButton />
      </main>
    );
  }

  const sync = await syncLink(session.user.id);

  if (!sync?.player.mcName) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-25">
        <div className="space-y-2 text-center">
          <h1 className="title text-4xl">Добро пожаловать на Tuesday!</h1>
          <p className="text-muted-foreground">
            Проверь привязку аккаунта или получи проходку на сервер.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-[1fr_auto_1fr] items-center">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Привязка аккаунта</CardTitle>
              <CardDescription>
                Уже есть Проходка? Проверь подключение и получи доступ к
                аккаунту.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <LinkStatus
                link={sync ? "not_linked" : "unavailable"}
                mcName={sync?.player.mcName ?? null}
                mcUuid={sync?.player.mcUuid ?? null}
              />
            </CardContent>
          </Card>

          <p>или</p>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Получить проходку</CardTitle>
              <CardDescription>
                Открой доступ к серверу Tuesday и присоединяйся к игре.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Еще нет проходки на наш сервер? Ее можно купить на сайте донатов
                или получить бесплатно, оставив анкету в Дискорде.
              </p>

              <Link
                href={LINKS["donate"].link}
                target="_blank"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                Купить проходку
              </Link>

              <Link
                href={LINKS["discord"].link}
                target="_blank"
                className={cn(
                  "w-full",
                  buttonVariants({ variant: "secondary" }),
                )}
              >
                Оставить анкету
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={<PlayerProfileFallback />}>
        <PlayerProfile name={sync.player.mcName} fromStats={false} />
        <div className="mt-8"><ReviewForm /></div>
      </Suspense>
    </main>
  );
}
