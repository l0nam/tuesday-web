import { getSession } from "@/lib/auth/session";
import { loadProfile, ProfileData } from "@/lib/profile/data";
import { refreshDiscordProfile } from "@/lib/profile/discord";
import { after, connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { PlayerHead } from "./player-head";
import { notFound } from "next/navigation";
import { siteTimezone } from "@/lib/utils/time";
import { cn } from "cn";
import { formatAgo, formatHours, pluralRu } from "@/lib/profile/stats";
import { SkinViewer } from "./skin-viewer";
import {
  BuildingsIcon,
  CrownIcon,
  DiscordLogoIcon,
  EyeIcon,
  FlameIcon,
  UserIcon,
  WalletIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DiscordVisibilityToggle } from "./discord-visibility-toggle";
import { CITY_ROLE_LABELS, DONATE_TIERS, PROFILE } from "@/lib/profile/config";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { formatNumber, formatСurrency } from "@/lib/utils/formatting";
import { BioEditor } from "./bio-editor";
import { Markdown } from "../markdown";
import { Heatmap } from "./heatmap";
import { Suspense } from "react";
import { BannerView } from "../cities/banner";
import { Icon } from "@phosphor-icons/react";

async function viewerId(): Promise<string | null> {
  try {
    return (await getSession())?.user.id ?? null;
  } catch (error) {
    console.error("[players] не удалось получить сессию:", error);
    return null;
  }
}

async function safeRefresh(uuid: string): Promise<void> {
  try {
    await refreshDiscordProfile(uuid);
  } catch (error) {
    console.error("[players] не удалось обновить данные Discord:", error);
  }
}

async function loadWithDiscord(
  name: string,
  viewer: string | null,
): Promise<ProfileData | null> {
  let profile = await loadProfile(name, viewer);
  if (!profile?.discordRefreshNeeded) return profile;

  const uuid = profile.uuid;
  if (profile.discordNeverChecked) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      safeRefresh(uuid),
      new Promise((resolve) => (timer = setTimeout(resolve, 2_500))),
    ]);
    clearTimeout(timer);
    profile = (await loadProfile(name, viewer)) ?? profile;
  } else {
    after(() => safeRefresh(uuid));
  }
  return profile;
}

const ROLE_DATA: Record<
  string,
  {
    icon: Icon;
    className: string;
  }
> = {
  admin: {
    icon: CrownIcon,
    className: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  },
  moderator: {
    icon: EyeIcon,
    className: "border-sky-500/40 bg-sky-500/15 text-sky-400",
  },
  player: {
    icon: UserIcon,
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  },
};

function StatTile({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>

        <p className="whitespace-nowrap text-2xl font-bold tabular-nums">
          {value}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        </p>

        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function PlayerProfileFallback() {
  return (
    <section
      aria-label="Загрузка профиля игрока"
      className="flex items-center min-h-svh justify-center w-full max-w-6xl mx-auto"
    >
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] flex-1">
        <div className="h-115 animate-pulse rounded-md border bg-card" />

        <div className="min-w-0 space-y-4">
          <div className="h-20 animate-pulse rounded-md border bg-card" />
          <div className="h-36 animate-pulse rounded-md border bg-card" />
          <div className="h-64 animate-pulse rounded-md border bg-card" />
        </div>
      </div>
    </section>
  );
}

async function PlayerContent({
  name,
  fromStats,
}: {
  name: string;
  fromStats?: boolean;
}) {
  await connection();
  const profile = await loadWithDiscord(name, await viewerId());
  if (!profile) notFound();

  const { stats, city, donate, isSelf } = profile;
  const tz = siteTimezone();
  const formatDate = (date: Date) =>
    date.toLocaleDateString("ru-RU", {
      timeZone: tz,
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const renderHeader = (showFace: boolean) => (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {showFace && (
        <PlayerHead nickname={profile.name} size={48} className="rounded-lg" />
      )}

      <h1 className="text-3xl title sm:text-4xl">{profile.name}</h1>

      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs",
          profile.online
            ? "border-primary/40 bg-primary/10 text-primary"
            : "bg-foreground/10 text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            profile.online
              ? "animate-pulse bg-primary"
              : "bg-muted-foreground/60",
          )}
        />
        {profile.online
          ? "Онлайн"
          : profile.lastSeenAt
            ? `Был в сети ${formatAgo(profile.lastSeenAt)}`
            : "Не в сети"}
      </span>

      {profile.roles && (
        <div className="flex flex-wrap gap-1.5">
          {profile.roles.map((role) => {
            const data = ROLE_DATA[role.tone] ?? ROLE_DATA.player;
            const Icon = data.icon;

            return (
              <span
                key={role.key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm font-medium",
                  data.className,
                )}
              >
                <Icon className="size-3.5" weight="bold" />
                {role.label}
              </span>
            );
          })}
        </div>
      )}
    </header>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Breadcrumb aria-label="Навигация" className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Главная</BreadcrumbLink>
          </BreadcrumbItem>

          {fromStats && (
            <>
              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink href="/stats">Статистика</BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />

          <BreadcrumbItem className="font-medium text-foreground">
            <PlayerHead nickname={name} className="size-5 rounded" />
            {profile.name}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Телефон */}
      <div className="mb-5 lg:hidden">{renderHeader(true)}</div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <SkinViewer username={profile.name} />

          {(profile.discordUsername && profile.showDiscord) || isSelf ? (
            <Card>
              <CardContent className="flex items-center justify-between flex-row">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md bg-indigo-400/15 text-indigo-400">
                    <DiscordLogoIcon size={22} weight="fill" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Дискорд</p>
                    <p className="truncate font-medium">
                      @{profile.discordUsername}
                    </p>
                  </div>
                </div>

                {isSelf && (
                  <DiscordVisibilityToggle
                    initialShowDiscord={profile.showDiscord}
                  />
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Город */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex gap-2 items-center">
                <span className="flex items-center justify-center rounded-md size-9 bg-primary/5">
                  <BuildingsIcon
                    className="size-5 text-primary"
                    weight="bold"
                  />
                </span>

                <span>Город</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {city ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {city.href ? (
                      <Link
                        href={city.href}
                        className="text-xl font-bold hover:text-primary"
                      >
                        {city.name}
                      </Link>
                    ) : (
                      <p className="text-xl font-bold">{city.name}</p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        city.role
                          ? (CITY_ROLE_LABELS[city.role] ?? city.role)
                          : null,
                        city.members != null
                          ? `${city.members} ${pluralRu(city.members, "житель", "жителя", "жителей")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {city.banner && (
                    <BannerView
                      banner={city.banner}
                      className="w-12"
                      label={`Флаг города ${city.name}`}
                    />
                  )}
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    {isSelf
                      ? "Вы пока не состоите в городе."
                      : "Не состоит в городе."}
                  </p>

                  {isSelf && (
                    <Link
                      href="/cities"
                      className={cn(buttonVariants({ variant: "default" }))}
                    >
                      Найти город
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {isSelf && (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex gap-2 items-center">
                  <span className="flex items-center justify-center rounded-md size-9 bg-primary/5">
                    <WalletIcon className="size-5 text-primary" weight="bold" />
                  </span>

                  <span>Баланс</span>
                </CardTitle>
              </CardHeader>

              <CardContent>
                {profile.balance !== null ? (
                  <>
                    <p className="text-xl tabular-nums">
                      {formatNumber(profile.balance)}{" "}
                      {formatСurrency(profile.balance)}
                    </p>
                    <Link
                      href="/shop"
                      className={cn(buttonVariants({ variant: "default" }))}
                    >
                      В магазин
                    </Link>
                  </>
                ) : profile.hasAccount ? (
                  <p className="text-muted-foreground">Баланс скрыт</p>
                ) : (
                  <p className="text-muted-foreground">Нет аккаунта на сайте</p>
                )}
              </CardContent>
            </Card>
          )}
        </aside>

        {/* ------------------------------ правая колонка ------------------------------ */}
        <div className="min-w-0 space-y-4">
          <div className="hidden lg:block">{renderHeader(false)}</div>

          {(isSelf || profile.bio) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">О себе</CardTitle>
              </CardHeader>

              <CardContent>
                {isSelf ? (
                  <BioEditor
                    initialBio={profile.bio}
                    initialShowDiscord={profile.showDiscord}
                    maxLength={PROFILE.bioMaxLength}
                  />
                ) : (
                  <Markdown>{profile.bio!}</Markdown>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex gap-2 items-center text-2xl">
                Донат
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ul className="divide-y divide-border">
                {Object.entries(DONATE_TIERS).map(([key, tier]) => {
                  const active = donate?.tier === key;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="text-lg font-semibold">{tier.name}</span>
                      {active ? (
                        <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
                          {donate?.expiresAt
                            ? `Активен до ${formatDate(donate.expiresAt)}`
                            : "Активен, бессрочно"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Не куплен
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {donate && !DONATE_TIERS[donate.tier] && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Также: {donate.name}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Статистика</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  label="Наиграл"
                  value={formatHours(stats.totalSeconds)}
                  unit="ч"
                />
                <StatTile
                  label="Месяц"
                  value={formatHours(stats.monthSeconds)}
                  unit="ч"
                />
                <StatTile
                  label="Неделя"
                  value={formatHours(stats.weekSeconds)}
                  unit="ч"
                />
                <StatTile
                  label="Сегодня"
                  value={formatHours(stats.todaySeconds)}
                  unit="ч"
                />
              </div>

              {stats.streak.current >= 5 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/30 bg-primary/5 px-4.5 py-3.5">
                  <span className="grid size-9 place-items-center rounded-md bg-primary/20 text-primary">
                    <FlameIcon size={20} weight="bold" />
                  </span>

                  <div>
                    <p className="text-xs">Серия заходов</p>
                    <p className="text-xl font-bold tabular-nums">
                      {stats.streak.current}{" "}
                      {pluralRu(stats.streak.current, "день", "дня", "дней")}{" "}
                      подряд
                    </p>
                  </div>

                  <p className="text-sm sm:ml-auto">
                    Рекорд: {stats.streak.best}{" "}
                    {pluralRu(stats.streak.best, "день", "дня", "дней")}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-heading font-medium mb-3">
                  Активность за {PROFILE.heatmapWeeks} недель
                </h3>
                <Heatmap columns={stats.heatmap} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export function PlayerProfile({
  name,
  fromStats = false,
}: {
  name: string;
  fromStats?: boolean;
}) {
  return (
    <Suspense fallback={<PlayerProfileFallback />}>
      <PlayerContent name={name} fromStats={fromStats} />
    </Suspense>
  );
}
