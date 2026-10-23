"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useScroll,
  useSpring,
} from "motion/react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  BookIcon,
  BuildingsIcon,
  ShoppingBagIcon,
  ShieldCheckIcon,
  TrendUpIcon,
  UserIcon,
  WalletIcon,
} from "@phosphor-icons/react/dist/ssr";
import BrandTitle from "./brand-title";
import { PlayerHead } from "./player/player-head";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DoorIcon } from "@phosphor-icons/react";
import { signOut } from "@/lib/auth/auth-client";
import { formatNumber } from "@/lib/utils/formatting";
import { LINKS } from "@/lib/data";

const NAV_LINKS = [
  { icon: BookIcon, label: "Вики", href: LINKS["wiki"].link },
  { icon: TrendUpIcon, label: "Статистика", href: "/stats" },
  { icon: BuildingsIcon, label: "Города", href: "/cities" },
  { icon: ShoppingBagIcon, label: "Магазин", href: "/shop" },
];

const ENTER_DELAY = 2.4;
const SCROLLED_AT = 24;
const REVEAL_AT = 8;

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];
const SNAP = { type: "spring", stiffness: 520, damping: 36 } as const;

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

function Logo() {
  return (
    <Link
      href="/"
      aria-label="Tuesday — на главную"
      className="outline-none focus-visible:ring-2 inline-flex items-center focus-visible:ring-primary/60"
    >
      <BrandTitle className="inline-flex items-center gap-2.5" />
    </Link>
  );
}

/* ───────────── Десктопное меню ───────────── */

function DesktopLinks({ pathname }: { pathname: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const activeHref = NAV_LINKS.find((l) => isActive(pathname, l.href))?.href;
  const selected = hovered ?? activeHref ?? null;

  return (
    <ul
      className="hidden items-center gap-1 md:flex"
      onMouseLeave={() => setHovered(null)}
    >
      {NAV_LINKS.map(({ label, href }) => {
        const active = isActive(pathname, href);
        const external = href.startsWith("http");

        return (
          <li key={href}>
            {external ? (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHovered(href)}
                onFocus={() => setHovered(href)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "relative flex h-11 px-3 items-center justify-center text-sm font-medium outline-none transition-colors duration-200",
                  selected === href
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {selected === href && (
                  <motion.span
                    layoutId="nav-selector"
                    transition={SNAP}
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-1/3 bg-primary"
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            ) : (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onMouseEnter={() => setHovered(href)}
                onFocus={() => setHovered(href)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "relative flex h-11 px-3 items-center justify-center text-sm font-medium outline-none transition-colors duration-200",
                  selected === href
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {selected === href && (
                  <motion.span
                    layoutId="nav-selector"
                    transition={SNAP}
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-1/3 bg-primary"
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── Мобильное меню ───────────── */

function MobileMenu({
  pathname,
  onClose,
  onAuthClick,
  user,
  player,
  balance,
  city,
  canAccessAdmin,
}: {
  pathname: string;
  onClose: () => void;
  onAuthClick?: () => void;
  user?: NavbarUser | null;
  player?: NavbarPlayer | null;
  balance: number | null;
  city?: NavbarCity | null;
  canAccessAdmin?: boolean;
}) {
  return (
    <motion.div
      id="mobile-menu"
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.25, ease: EASE }}
      style={{ originY: 0 }}
      className="pointer-events-auto absolute inset-x-0 top-full mt-2 overflow-hidden rounded-lg bg-background/90 p-2 ring-1 ring-inset ring-foreground/10 backdrop-blur-xl md:hidden"
    >
      <ul className="flex flex-col">
        {NAV_LINKS.map(({ icon: Icon, label, href }, i) => {
          const active = isActive(pathname, href);
          return (
            <motion.li
              key={href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.3, ease: EASE }}
            >
              <Link
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon weight="bold" />
                {label}
                {active && (
                  <span aria-hidden className="size-1.5 bg-primary ml-auto" />
                )}
              </Link>
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-col gap-2 border-t p-2 pt-3">
        {user ? (
          <NavbarAccount
            user={user}
            player={player}
            balance={balance}
            mobile
            city={city}
            canAccessAdmin={canAccessAdmin}
          />
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onClose();
              onAuthClick?.();
            }}
          >
            Авторизоваться
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ───────────── Navbar ───────────── */

type NavbarUser = {
  name: string;
  image?: string | null;
};

type NavbarPlayer = {
  mcName: string | null;
};

type NavbarCity = {
  name: string;
  href: string;
};

type NavbarProps = {
  onAuthClick?: () => void;
  user?: NavbarUser | null;
  player?: NavbarPlayer | null;
  balance?: number | null;
  city?: NavbarCity | null;
  canAccessAdmin?: boolean;
};

function NavbarAccount({
  user,
  player,
  mobile = false,
  balance,
  onClose,
  city,
  canAccessAdmin = false,
}: {
  user: NavbarUser;
  player?: NavbarPlayer | null;
  mobile?: boolean;
  balance: number | null;
  onClose?: () => void;
  city?: NavbarCity | null;
  canAccessAdmin?: boolean;
}) {
  const mcName = player?.mcName;
  const displayName = mcName || user.name;

  const links = [
    {
      label: "Профиль",
      href: "/profile",
      icon: UserIcon,
    },
    {
      label: "Кошелёк",
      href: "/shop",
      icon: WalletIcon,
      value: balance,
    },
  ] as const;

  const extraLinks = [
    ...(city
      ? [
          {
            label: city.name,
            href: city.href,
            icon: BuildingsIcon,
          },
        ]
      : []),
    ...(canAccessAdmin
      ? [
          {
            label: "Админ-панель",
            href: "/admin",
            icon: ShieldCheckIcon,
          },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = "/";
    }
  };

  const SignOutButton = ({ className }: { className?: string }) => (
    <Button
      variant="destructive"
      onClick={() => void handleSignOut()}
      className={cn("w-full justify-start", className)}
    >
      <DoorIcon weight="bold" />
      Выйти
    </Button>
  );

  if (mobile) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-2">
          <PlayerHead nickname={mcName} className="size-8 rounded-md" />

          <span className="min-w-0 truncate text-sm font-medium">
            {displayName}
          </span>

          {player && !mcName && (
            <span
              className="size-2 shrink-0 rounded-full bg-amber-400"
              title="Minecraft-аккаунт не привязан"
            />
          )}
        </div>

        {links.map(({ label, href, icon: Icon, ...item }) => (
          <Link
            key={label}
            href={href}
            onClick={onClose}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full justify-start",
            )}
          >
            <Icon weight="bold" />
            {label}

            {"value" in item && (
              <span className="ml-auto rounded bg-primary px-3 py-0.5 tabular-nums">
                {formatNumber(Number(item.value), true) ?? "—"}
              </span>
            )}
          </Link>
        ))}

        {extraLinks.length > 0 && (
          <>
            <div className="my-1 h-px w-full bg-border" />

            {extraLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full justify-start",
                )}
              >
                <Icon weight="bold" />
                {label}
              </Link>
            ))}
          </>
        )}

        <div className="my-1 h-px w-full bg-border" />

        <SignOutButton className="mt-1" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hidden items-center gap-2 pr-2 md:inline-flex"
        aria-label={`Меню аккаунта: ${displayName}`}
      >
        <PlayerHead nickname={mcName} className="size-9 rounded-md" />

        {player && !mcName && (
          <span
            className="size-2 rounded-full bg-amber-400"
            title="Minecraft-аккаунт не привязан"
          />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {links.map(({ label, href, icon: Icon, ...item }) => (
          <DropdownMenuItem key={label} className="p-0">
            <Link
              href={href}
              className={cn(
                "flex w-full justify-start! gap-2",
                buttonVariants({ variant: "ghost" }),
              )}
            >
              <Icon weight="bold" />
              {label}

              {"value" in item && (
                <span className="ml-auto rounded bg-primary px-2 py-0.5 tabular-nums">
                  {formatNumber(Number(item.value), true) ?? "—"}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        ))}

        {extraLinks.length > 0 && (
          <>
            <DropdownMenuSeparator />

            {extraLinks.map(({ label, href, icon: Icon }) => (
              <DropdownMenuItem key={href} className="p-0">
                <Link
                  href={href}
                  className={cn(
                    "flex w-full justify-start! gap-2",
                    buttonVariants({ variant: "ghost" }),
                  )}
                >
                  <Icon weight="bold" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        <SignOutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar({
  onAuthClick,
  user = null,
  player = null,
  balance = null,
  city = null,
  canAccessAdmin = false,
}: NavbarProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reveal, setReveal] = useState<
    "hidden" | "intro" | "scroll" | "restore"
  >("hidden");
  const [animateStyle, setAnimateStyle] = useState(false);
  const revealedRef = useRef(false);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.3,
  });

  const sync = useCallback(
    (onLoad = false) => {
      const y = window.scrollY;
      setScrolled(y > SCROLLED_AT);

      if (y > REVEAL_AT && !revealedRef.current) {
        revealedRef.current = true;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.jump(max > 0 ? Math.min(1, y / max) : 0);
        setReveal(onLoad ? "restore" : "scroll");
      }
    },
    [progress],
  );

  useIsoLayoutEffect(() => {
    sync(true);
  }, [sync]);

  useEffect(() => {
    const onScroll = () => sync();
    const onPageShow = () => sync(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [sync]);

  const introDelay = currentPath === "/" ? ENTER_DELAY : 0;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      setReveal("intro");
    }, introDelay * 1000);
    return () => clearTimeout(timer);
  }, [introDelay]);

  useEffect(() => {
    if (reveal === "hidden") return;
    const timer = setTimeout(() => setAnimateStyle(true), 150);
    return () => clearTimeout(timer);
  }, [reveal]);

  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isHidden = reveal === "hidden";
  const revealDuration =
    reveal === "restore" ? 0 : reveal === "scroll" ? 0.25 : 0.8;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="navbar">
        <motion.header
          initial={{ y: -96, opacity: 0 }}
          animate={isHidden ? { y: -96, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: revealDuration, ease: EASE }}
          className={cn(
            "pointer-events-none fixed inset-x-0 top-4 z-50 px-4",
            isHidden && "invisible",
          )}
        >
          <div className="relative mx-auto max-w-5xl">
            <nav
              aria-label="Основная навигация"
              className={cn(
                "pointer-events-auto relative flex items-center justify-between gap-3 overflow-hidden rounded-lg pl-5 pr-2 ring-1 ring-inset",
                animateStyle &&
                  "transition-[background-color,height,ring,padding] duration-500",
                scrolled
                  ? "bg-background/90 ring-foreground/10 h-14 backdrop-blur-xl"
                  : "bg-transperent ring-transparent h-15",
              )}
            >
              <Logo />

              <DesktopLinks pathname={currentPath} />

              <div className="flex items-center gap-2">
                {user ? (
                  <NavbarAccount
                    user={user}
                    player={player}
                    balance={balance}
                    city={city}
                    canAccessAdmin={canAccessAdmin}
                  />
                ) : (
                  <Button
                    className="hidden px-4 md:inline-flex"
                    onClick={onAuthClick}
                  >
                    Авторизоваться
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  aria-controls="mobile-menu"
                  aria-label={open ? "Закрыть меню" : "Открыть меню"}
                  className="relative size-10 rounded-md outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary/60 md:hidden"
                >
                  <motion.span
                    animate={{ y: open ? 0 : -4, rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="absolute left-1/2 top-1/2 -ml-2.5 -mt-px h-0.5 w-5 rounded-full bg-foreground"
                  />
                  <motion.span
                    animate={{ y: open ? 0 : 4, rotate: open ? -45 : 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="absolute left-1/2 top-1/2 -ml-2.5 -mt-px h-0.5 w-5 rounded-full bg-foreground"
                  />
                </button>
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-transperent"
              >
                <motion.div
                  style={{ scaleX: progress, originX: 0 }}
                  className="h-full w-[90%] bg-primary mx-auto"
                />
              </div>
            </nav>

            <AnimatePresence>
              {open && (
                <MobileMenu
                  pathname={currentPath}
                  onClose={() => setOpen(false)}
                  onAuthClick={onAuthClick}
                  user={user}
                  player={player}
                  balance={balance}
                  city={city}
                  canAccessAdmin={canAccessAdmin}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.header>
      </LayoutGroup>
    </MotionConfig>
  );
}
