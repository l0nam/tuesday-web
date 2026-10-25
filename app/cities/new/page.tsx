import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { SignInButton } from "@/components/auth/sign-in-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CreateCityForm } from "@/components/cities/create-city-form";
import { getSession } from "@/lib/auth/session";
import { getMembership } from "@/lib/cities/queries";
import { getPlayer, syncLink } from "@/lib/player";

export const metadata: Metadata = { title: "Создать клан" };

export default function NewCityPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6">
      <Breadcrumb aria-label="Навигация" className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Главная</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/clans">Кланы</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="font-medium text-foreground">
            Создать клан
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="title text-4xl">Создать город</h1>

      <Suspense
        fallback={
          <div className="mt-8 h-96 animate-pulse rounded-xl bg-card" />
        }
      >
        <NewCityContent />
      </Suspense>
    </main>
  );
}

function Notice({
  children,
  action,
}: {
  children: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <Card className="mt-8">
      <CardContent className="items-start gap-4">
        <p className="text-muted-foreground">{children}</p>
        {action}
      </CardContent>
    </Card>
  );
}

async function NewCityContent() {
  const session = await getSession();

  if (!session) {
    return (
      <Notice action={<SignInButton callbackURL="/clans/new" />}>
        Войдите через Discord, чтобы создать клан.
      </Notice>
    );
  }

  const userId = session.user.id;
  const membership = await getMembership(userId);
  if (membership) {
    return (
      <Notice
        action={
          <Link
            href={`/clans/${membership.cityId}`}
            className={cn(buttonVariants())}
          >
            Перейти в клан
          </Link>
        }
      >
        Вы уже состоите в клане «{membership.cityName}». Игрок может состоять
        только в одном клане и создать только один.
      </Notice>
    );
  }

  const sync = await syncLink(userId).catch(() => null);
  const player = sync?.player ?? (await getPlayer(userId));
  if (!player?.mcUuid) {
    return (
      <Notice
        action={
          <Link href="/profile" className={cn(buttonVariants())}>
            Привязать аккаунт
          </Link>
        }
      >
        Чтобы создать клан, привяжите Discord к игровому аккаунту: владелец
        клана получает награду и отображается по игровому нику.
      </Notice>
    );
  }

  return (
    <Card className="mt-8">
      <CardContent>
        <CreateCityForm />
      </CardContent>
    </Card>
  );
}
