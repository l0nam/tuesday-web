import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CrownIcon,
  DiscordLogoIcon,
  GiftIcon,
  LinkIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PlayerHead } from "@/components/player/player-head";
import { BannerView } from "@/components/cities/banner";
import { RecruitingBadge } from "@/components/cities/city-grid";
import { JoinPanel, type ViewerState } from "@/components/cities/join-panel";
import { ApplicationsList } from "@/components/cities/applications-panel";
import { MemberControls } from "@/components/cities/member-controls";
import { CitySettings } from "@/components/cities/city-settings";
import { getSession } from "@/lib/auth/session";
import {
  getCity,
  getMembership,
  getMyApplication,
  listPendingApplications,
  listResidents,
} from "@/lib/cities/queries";
import { CITY, CITY_ROLE_TITLES } from "@/lib/cities/rules";
import { formatNumber, formatCurrency, pluralRu, formatAgo } from "@/lib/utils/formatting";

export const metadata: Metadata = { title: "Город" };

type Props = { params: Promise<{ id: string }> };

export default function CityPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6">
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-xl bg-card"
            aria-busy="true"
          />
        }
      >
        <CityContent params={params} />
      </Suspense>
    </main>
  );
}

async function CityContent({ params }: Props) {
  const cityId = Number((await params).id);
  if (!Number.isSafeInteger(cityId) || cityId < 1) notFound();

  let userId: string | null = null;
  try {
    userId = (await getSession())?.user.id ?? null;
  } catch (error) {
    console.error("[cities] не удалось получить сессию:", error);
  }

  const city = await getCity(cityId);
  if (!city) notFound();

  const [residents, membership, myApplication] = await Promise.all([
    listResidents(cityId),
    userId ? getMembership(userId) : null,
    userId ? getMyApplication(cityId, userId) : null,
  ]);

  const role = membership?.cityId === cityId ? membership.role : null;
  const isOwner = role === "owner";
  const canManage = isOwner || role === "coowner";
  const now = new Date();

  const applications = canManage ? await listPendingApplications(cityId) : [];

  let viewer: ViewerState;
  if (!userId) viewer = { kind: "guest" };
  else if (isOwner) viewer = { kind: "owner" };
  else if (role) viewer = { kind: "member" };
  else if (membership)
    viewer = {
      kind: "elsewhere",
      cityId: membership.cityId,
      cityName: membership.cityName,
    };
  else {
    viewer = {
      kind: "applicant",
      recruiting: city.recruiting,
      application: myApplication
        ? {
            status:
              myApplication.status === "pending"
                ? "pending"
                : myApplication.status === "rejected"
                  ? "rejected"
                  : "other",
            rejectReason: myApplication.rejectReason,
          }
        : null,
    };
  }

  const owner = residents.find((r) => r.role === "owner");
  const createdAt = city.createdAt.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const rewardLeft = Math.max(0, CITY.rewardMinMembers - city.members);

  return (
    <>
      <Breadcrumb aria-label="Навигация" className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Главная</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/cities">Города</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="font-medium text-foreground">
            {city.name}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row">
          <BannerView
            banner={city.banner}
            className="w-24 sm:w-28"
            label={`Флаг города ${city.name}`}
          />

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <h1 className="title text-3xl sm:text-4xl">{city.name}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <RecruitingBadge recruiting={city.recruiting} />

                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <UsersIcon weight="bold" className="size-4" />
                  <span className="tabular-nums">
                    {city.members}{" "}
                    {pluralRu(city.members, "житель", "жителя", "жителей")}
                  </span>
                </span>

                <span className="text-sm text-muted-foreground">
                  Основан {createdAt}
                </span>
              </div>
            </div>

            {city.description && (
              <p className="max-w-2xl whitespace-pre-line text-pretty text-muted-foreground">
                {city.description}
              </p>
            )}

            {city.discordUrl && (
              <Link
                href={city.discordUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                <DiscordLogoIcon
                  weight="fill"
                  className="size-5 text-indigo-400"
                />
                Сервер города
                <LinkIcon weight="bold" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  Заявки на вступление
                  {applications.length > 0 && (
                    <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-sm text-primary-foreground tabular-nums">
                      {applications.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ApplicationsList
                  cityId={cityId}
                  items={applications.map((a) => ({
                    id: a.id,
                    name: a.name,
                    mcName: a.mcName,
                    message: a.message,
                    ago: formatAgo(a.createdAt, now),
                  }))}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Жители</CardTitle>
            </CardHeader>

            <CardContent>
              <ul className="divide-y">
                {residents.map((r) => {
                  const targetRole = r.role;
                  const canChangeRole = isOwner && targetRole !== "owner";
                  const canKick =
                    targetRole !== "owner" &&
                    r.userId !== userId &&
                    (isOwner ||
                      (role === "coowner" && targetRole === "member"));

                  return (
                    <li
                      key={r.userId}
                      className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <PlayerHead
                        nickname={r.mcName}
                        size={40}
                        className="size-10 rounded-md"
                      />

                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        {r.mcName ? (
                          <Link
                            href={`/players/${encodeURIComponent(r.mcName)}`}
                            className="truncate font-medium hover:text-primary"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          <span className="truncate font-medium">{r.name}</span>
                        )}

                        {targetRole !== "member" && (
                          <span title={CITY_ROLE_TITLES[targetRole]}>
                            <CrownIcon
                              className="size-5 text-amber-500"
                              weight={
                                targetRole === "owner" ? "fill" : "duotone"
                              }
                            />
                          </span>
                        )}
                      </div>

                      {(canChangeRole || canKick) && (
                        <MemberControls
                          cityId={cityId}
                          userId={r.userId}
                          role={targetRole}
                          canChangeRole={canChangeRole}
                          canKick={canKick}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {viewer.kind === "member" || viewer.kind === "owner"
                  ? "Ваш город"
                  : "Вступление"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JoinPanel cityId={cityId} viewer={viewer} />
            </CardContent>
          </Card>

          {isOwner && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Управление городом</CardTitle>
                </CardHeader>
                <CardContent>
                  <CitySettings
                    cityId={cityId}
                    recruiting={city.recruiting}
                    discordUrl={city.discordUrl}
                    description={city.description}
                  />
                </CardContent>
              </Card>

              {rewardLeft > 0 && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      Награда владельцу
                    </CardTitle>

                    <CardDescription>
                      Когда в городе станет {CITY.rewardMinMembers} жителей, вы{" "}
                      получите {formatNumber(CITY.rewardAmount)}{" "}
                      {formatCurrency(CITY.rewardAmount)}. Осталось пригласить:{" "}
                      {rewardLeft}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (city.members / CITY.rewardMinMembers) * 100)}%`,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!isOwner && owner && (
            <Card size="sm">
              <CardContent className="flex-row items-center gap-3">
                <PlayerHead
                  nickname={owner.mcName}
                  size={32}
                  className="size-8 rounded-md"
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Владелец</p>
                  <p className="truncate text-sm font-medium">{owner.name}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
