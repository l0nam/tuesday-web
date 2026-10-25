"use client";

import { LINKS } from "@/lib/data";
import Link from "next/link";
import BrandTitle from "./brand-title";
import { LinkIcon } from "@phosphor-icons/react";
import { cn } from "cn";

type FooterLink = { label: string; href: string };

const SERVER_LINKS: FooterLink[] = [
  { label: "Главная", href: "/" },
  { label: "Статистика", href: "/stats" },
  { label: "Кланы", href: "/cities" },
  { label: "Магазин", href: "/shop" },
  { label: "Отзывы", href: "/reviews" },
];

const INFO_LINKS: FooterLink[] = [
  { label: LINKS["wiki"].name, href: LINKS["wiki"].link },
  { label: "Кошелёк", href: "/#wallet" },
  { label: "Частые вопросы", href: "/#faq" },
];

const COMMUNITY_LINKS: FooterLink[] = Object.entries(LINKS)
  .filter(([key]) => key !== "wiki")
  .map(([, { name, link }]) => ({
    label: name,
    href: link,
  }));

const linkClass =
  "text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <nav aria-label={title}>
      <p className="text-sm font-medium">{title}</p>

      <ul className="mt-4 space-y-3">
        {links.map((link) => {
          const external = link.href.startsWith("http");

          const content = (
            <>
              <span className="transition-colors group-hover:text-foreground group-hover:underline">
                {link.label}
              </span>

              {external && (
                <LinkIcon
                  className="size-3 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                  weight="bold"
                />
              )}
            </>
          );

          return (
            <li key={link.label}>
              {external ? (
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group inline-flex items-center gap-2",
                    linkClass,
                  )}
                >
                  {content}
                </Link>
              ) : (
                <Link
                  href={link.href}
                  className={cn(
                    "group inline-flex items-center gap-2",
                    linkClass,
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[3fr_1fr_1fr_1fr] lg:px-10">
        <div>
          <Link
            href="/"
            aria-label="Tuesday — на главную"
            className="inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <BrandTitle className="inline-flex items-center gap-2.5" />
          </Link>
          <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
            Уникальный ванильный сервер Майнкрафт. Выживание и творчество вместе
            с другими игроками.
          </p>
        </div>

        <FooterColumn title="Сервер" links={SERVER_LINKS} />
        <FooterColumn title="Информация" links={INFO_LINKS} />
        <FooterColumn title="Сообщество" links={COMMUNITY_LINKS} />
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between lg:px-10">
          <p>© 2026 Tuesday</p>
          <p>
            Сервер не связан с Mojang Studios и Microsoft. Minecraft — торговая
            марка Mojang Synergies AB.
          </p>
        </div>
      </div>
    </footer>
  );
}
