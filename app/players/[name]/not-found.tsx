import { buttonVariants } from "@/components/ui/button";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import Link from "next/link";

export default function PlayerNotFound() {
  return (
    <main className="mx-auto flex w-full min-h-svh justify-center max-w-lg flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl title">Игрок не найден</h1>
      <p className="text-muted-foreground">
        Профиль появляется, когда игрок заходит на сервер. Проверьте, нет ли
        опечатки в нике.
      </p>

      <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
        <HouseIcon weight="bold" />
        На главную
      </Link>
    </main>
  );
}
