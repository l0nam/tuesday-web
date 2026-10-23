import { cn } from "cn";
import { ReactNode } from "react";

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl ring-1 ring-border bg-card p-4 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "good" | "bad" | "neutral" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-sm font-medium",
        tone === "good" &&
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "warn" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
