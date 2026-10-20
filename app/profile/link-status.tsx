"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  link: "linked" | "not_linked" | "unavailable";
  mcName: string | null;
  mcUuid: string | null;
};

export function LinkStatus({ link, mcName, mcUuid }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/me/link", { method: "POST" });
      const data = (await res.json()) as {
        link?: string;
        claimed?: { total: number };
        error?: { message: string };
      };
      if (!res.ok) {
        setMessage(data.error?.message ?? "Не удалось проверить привязку");
      } else if (data.link === "linked") {
        setMessage(
          data.claimed && data.claimed.total > 0
            ? `Привязка найдена, зачислено ${data.claimed.total} Вторничков`
            : "Привязка найдена",
        );
        window.dispatchEvent(new Event("account:refresh"));
        router.refresh();
      } else if (data.link === "not_linked") {
        setMessage(
          "Привязка пока не найдена. Проверьте, что отправили код боту, и повторите.",
        );
        router.refresh();
      } else {
        setMessage("Не удалось связаться с базой DiscordSRV, попробуйте позже");
      }
    } catch {
      setMessage("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  const button = (
    <Button onClick={check} disabled={busy} className="w-full">
      {busy ? (
        <>
          <Spinner /> Проверяем…{" "}
        </>
      ) : (
        "Проверить привязку"
      )}
    </Button>
  );

  if (link === "linked") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Игровой аккаунт</p>
        <p className="text-lg font-semibold">
          {mcName ?? "Ник определится при следующем входе в игру"}
        </p>
        {mcUuid && (
          <p className="break-all font-mono text-xs text-muted-foreground">
            {mcUuid}
          </p>
        )}
        {button}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    );
  }

  if (link === "unavailable") {
    return (
      <div className="space-y-3">
        <p className="font-medium">Не удалось проверить привязку</p>
        <p className="text-sm text-muted-foreground">
          База DiscordSRV сейчас недоступна. Попробуйте чуть позже.
        </p>
        {button}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">Привяжите Discord к игровому аккаунту</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Без привязки магазин и начисления недоступны. Награды, которые вы
          заработаете в игре до привязки, не пропадут: они зачислятся сразу
          после неё.
        </p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Зайдите на сервер Tuesday.</li>
        <li>
          Введите в игре команду{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            /discord link
          </code>
          .
        </li>
        <li>
          Отправьте полученный код в личные сообщения боту сервера в Discord.
        </li>
        <li>Вернитесь сюда и нажмите «Проверить привязку».</li>
      </ol>
      {button}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
