import type { ReactNode } from "react";
import { cn } from "cn";

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-20 sm:py-28", className)}>
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">{children}</div>
    </section>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-6 sm:mb-14 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2 className="title text-3xl text-foreground md:text-4xl">{title}</h2>
        {description && (
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
