import Link from "next/link";
import {
  ArrowLeftIcon,
  CompassIcon,
  HouseIcon,
  MapTrifoldIcon,
  SmileyIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 size-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px] sm:size-175" />
        <div className="absolute inset-0 bg-radial-[at_50%_50%] from-transparent to-background/80" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <div className="relative mb-4 grid size-12 place-items-center rounded-md bg-card ring-1 ring-inset ring-border">
          <CompassIcon
            className="relative size-7 text-primary"
            weight="duotone"
          />
        </div>

        <p className="title select-none text-[100px] font-medium">404</p>

        <div className="mt-4 space-y-3">
          <p className="font-medium text-primary">Похоже, вы заблудились</p>

          <h1 className="title text-3xl tracking-tight sm:text-4xl">
            Этой страницы не существует
          </h1>

          <p className="mx-auto max-w-md text-pretty leading-relaxed text-muted-foreground sm:text-lg">
            Кажется, вы свернули не туда. Такой страницы нет или она была
            перемещена. Давайте вернёмся на знакомую территорию.
          </p>
        </div>

        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/"
            className={cn(buttonVariants({ size: "lg" }), "text-background")}
          >
            <HouseIcon weight="bold" />
            На главную
          </Link>
          <Link
            href="/map"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <MapTrifoldIcon weight="bold" />
            Карта сервера
          </Link>
        </div>

        <p className="mt-10 text-sm inline-flex gap-1.5 text-muted-foreground items-center">
          Ну, или оставайтесь тут и отдохните{" "}
          <SmileyIcon weight="bold" className="size-4" />
        </p>
      </div>
    </main>
  );
}
