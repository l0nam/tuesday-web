"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorNote, useCityApi } from "@/components/cities/use-city-api";

export function MemberControls({
  cityId,
  userId,
  role,
  canChangeRole,
  canKick,
}: {
  cityId: number;
  userId: string;
  role: "coowner" | "member";
  canChangeRole: boolean;
  canKick: boolean;
}) {
  const { busy, error, call, refresh } = useCityApi();
  const [confirmKick, setConfirmKick] = useState(false);
  const url = `/api/cities/${cityId}/members/${encodeURIComponent(userId)}`;

  async function toggleRole() {
    if (
      await call(url, "PATCH", {
        role: role === "coowner" ? "member" : "coowner",
      })
    )
      refresh();
  }
  async function kick() {
    if (await call(url, "DELETE")) refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {canChangeRole && (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => void toggleRole()}
            disabled={busy}
          >
            {busy ? (
              <Spinner />
            ) : role === "coowner" ? (
              "Снять совладельца"
            ) : (
              "Сделать совладельцем"
            )}
          </Button>
        )}
        {canKick &&
          (confirmKick ? (
            <>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => void kick()}
                disabled={busy}
              >
                Исключить?
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setConfirmKick(false)}
                disabled={busy}
              >
                Нет
              </Button>
            </>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirmKick(true)}
              disabled={busy}
            >
              Исключить
            </Button>
          ))}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
