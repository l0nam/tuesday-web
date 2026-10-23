"use client";

import { useState } from "react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, useCityApi } from "@/components/cities/use-city-api";
import Link from "next/link";
import { CITY } from "@/lib/cities/rules";

export type ViewerState =
  | { kind: "guest" }
  | { kind: "owner" }
  | { kind: "member" }
  | { kind: "elsewhere"; cityId: number; cityName: string }
  | {
      kind: "applicant";
      recruiting: boolean;
      application: {
        status: "pending" | "rejected" | "other";
        rejectReason: string | null;
      } | null;
    };

export function JoinPanel({
  cityId,
  viewer,
}: {
  cityId: number;
  viewer: ViewerState;
}) {
  const { busy, error, call, refresh } = useCityApi();
  const [message, setMessage] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function apply() {
    if (await call(`/api/cities/${cityId}/applications`, "POST", { message })) {
      setMessage("");
      refresh();
    }
  }
  async function cancel() {
    if (await call(`/api/cities/${cityId}/applications`, "DELETE")) refresh();
  }
  async function leave() {
    if (await call(`/api/cities/${cityId}/leave`, "POST")) {
      setConfirmLeave(false);
      refresh();
    }
  }

  switch (viewer.kind) {
    case "guest":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Войдите через Discord, чтобы подать заявку в город.
          </p>
          <SignInButton callbackURL={`/cities/${cityId}`} />
        </div>
      );

    case "owner":
      return (
        <p className="text-sm text-muted-foreground">
          Вы владелец этого города. Заявки и настройки находятся на этой
          странице.
        </p>
      );

    case "member":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Вы живёте в этом городе.
          </p>
          {confirmLeave ? (
            <div className="space-y-2">
              <p className="text-sm">
                Точно покинуть город? Вернуться можно будет только по новой
                заявке.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => void leave()}
                  disabled={busy}
                >
                  {busy ? <Spinner /> : "Да, покинуть"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmLeave(false)}
                  disabled={busy}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmLeave(true)}>
              Покинуть город
            </Button>
          )}
          <ErrorNote message={error} />
        </div>
      );

    case "elsewhere":
      return (
        <p className="text-sm text-muted-foreground">
          Вы уже состоите в городе{" "}
          <Link href={`/cities/${viewer.cityId}`} className="link">
            {viewer.cityName}
          </Link>
          . Чтобы вступить сюда, сначала покиньте его.
        </p>
      );

    case "applicant": {
      const { application, recruiting } = viewer;

      if (application?.status === "pending") {
        return (
          <div className="space-y-3">
            <p className="text-sm">
              <b>Заявка отправлена.</b> Владелец или совладельцы города скоро её
              рассмотрят.
            </p>
            <Button
              variant="secondary"
              onClick={() => void cancel()}
              disabled={busy}
            >
              {busy ? <Spinner /> : "Отозвать заявку"}
            </Button>
            <ErrorNote message={error} />
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {application?.status === "rejected" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">
                Ваша заявка отклонена
              </p>
              <p className="mt-1 text-foreground/90">
                Причина:{" "}
                <span className="whitespace-pre-line">
                  {application.rejectReason ?? "не указана"}
                </span>
              </p>
            </div>
          )}

          {recruiting ? (
            <>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={CITY.messageMax}
                rows={3}
                aria-label="Сообщение владельцу"
                placeholder="Пара слов о себе (необязательно)"
              />
              <Button
                onClick={() => void apply()}
                disabled={busy}
                className="w-full"
              >
                {busy ? (
                  <>
                    <Spinner /> Отправляю…
                  </>
                ) : application?.status === "rejected" ? (
                  "Подать заявку снова"
                ) : (
                  "Подать заявку"
                )}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Набор в этот город сейчас закрыт.
            </p>
          )}
          <ErrorNote message={error} />
        </div>
      );
    }
  }
}
