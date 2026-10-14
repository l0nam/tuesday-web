"use client";

import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { Section } from "../ui/section";
import { BookIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { LINKS } from "@/lib/data";
import { cn } from "cn";

export function WikiSocialsCta({
  href = LINKS["wiki"].link,
}: {
  href?: string;
}) {
  return (
    <Section id="wiki" className="pt-0">
      <div className="flex flex-col md:flex-row justify-between gap-3.5">
        {Object.entries(LINKS)
          .filter(([key]) => key !== "wiki")
          .map(([key, { name, link, icon: Icon, colors }]) => (
            <Link
              key={key}
              href={link}
              aria-label={name}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group p-6 md:p-8 rounded-xl text-white h-50",
                "flex md:flex-col justify-between items-center md:items-start flex-1",
                "transition-[background-color,translate] duration-200",
                "hover:-translate-y-0.5",
                colors,
              )}
            >
              <span className="title text-xl">{name}</span>

              <div className="flex items-end justify-between w-full flex-1">
                <span className="group-hover:underline hidden font-medium md:inline-flex items-center gap-1">
                  Перейти
                  <LinkIcon
                    className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition"
                    weight="bold"
                  />
                </span>

                <Icon className="size-7 ml-auto" weight="fill" />
              </div>
            </Link>
          ))}
      </div>

      <div className="flex flex-col mt-4 gap-8 rounded-xl bg-card p-8 ring-1 ring-inset ring-border md:flex-row md:items-start md:justify-between md:p-12">
        <div className="flex items-start gap-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <BookIcon className="size-7" />
          </span>
          <div>
            <h2 className="title text-xl md:text-2xl">
              Все правила и гайды в вики
            </h2>
            <p className="mt-2 max-w-lg text-pretty leading-relaxed text-muted-foreground">
              Правила, команды и советы по игре собраны в одном месте и всегда
              под рукой.
            </p>
          </div>
        </div>

        <Link
          href={href}
          className={cn(
            buttonVariants({ className: "shrink-0" }),
            "text-background",
          )}
          target="_blank"
        >
          Открыть вики
          <LinkIcon weight="bold" />
        </Link>
      </div>
    </Section>
  );
}
