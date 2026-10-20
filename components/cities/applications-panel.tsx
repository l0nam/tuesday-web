"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { PlayerHead } from "@/components/player/player-head";
import { ErrorNote, useCityApi } from "@/components/cities/use-city-api";
import { CITY } from "@/lib/cities/rules";

export interface ApplicationItem {
  id: number;
  name: string;
  mcName: string | null;
  message: string | null;
  /** Уже отформатированное "5 минут назад" */
  ago: string;
}

function ApplicationRow({ cityId, item, onNotice }: { cityId: number; item: ApplicationItem; onNotice: (text: string) => void }) {
  const { busy, error, call, refresh } = useCityApi();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function accept() {
    const res = await call<{ rewardGranted?: boolean }>(`/api/cities/${cityId}/applications/${item.id}`, "POST", { action: "accept" });
    if (!res) return;
    if (res.rewardGranted) onNotice(`В городе набралось ${CITY.rewardMinMembers} жителей: владелец получил ${CITY.rewardAmount} Вторничков.`);
    refresh();
  }

  async function reject() {
    const res = await call(`/api/cities/${cityId}/applications/${item.id}`, "POST", { action: "reject", reason });
    if (res) refresh();
  }

  const reasonLength = Array.from(reason.trim()).length;

  return (
    <li className="space-y-3 rounded-lg bg-muted/40 p-3">
      <div className="flex items-start gap-3">
        <PlayerHead nickname={item.mcName} size={40} className="size-10 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            {item.mcName ? (
              <Link href={`/players/${encodeURIComponent(item.mcName)}`} className="font-medium hover:text-primary">
                {item.name}
              </Link>
            ) : (
              <span className="font-medium">{item.name}</span>
            )}
            <span className="text-xs text-muted-foreground">{item.ago}</span>
          </p>
          {item.message ? (
            <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{item.message}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground/70">Без сообщения</p>
          )}
        </div>
      </div>

      {rejecting ? (
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={CITY.reasonMax}
            rows={2}
            autoFocus
            aria-label="Причина отказа"
            placeholder="Причина отказа (её увидит игрок)"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => void reject()} disabled={busy || reasonLength < CITY.reasonMin}>
              {busy ? <Spinner /> : "Отклонить"}
            </Button>
            <Button variant="secondary" onClick={() => setRejecting(false)} disabled={busy}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void accept()} disabled={busy}>
            {busy ? <Spinner /> : <CheckIcon weight="bold" />}
            Принять
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRejecting(true)} disabled={busy}>
            <XIcon weight="bold" />
            Отказать
          </Button>
        </div>
      )}
      <ErrorNote message={error} />
    </li>
  );
}

export function ApplicationsList({ cityId, items }: { cityId: number; items: ApplicationItem[] }) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          {notice}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Новых заявок нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ApplicationRow key={item.id} cityId={cityId} item={item} onNotice={setNotice} />
          ))}
        </ul>
      )}
    </div>
  );
}
