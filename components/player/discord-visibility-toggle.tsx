"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeClosedIcon, EyeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Props = {
  initialShowDiscord: boolean;
};

export function DiscordVisibilityToggle({ initialShowDiscord }: Props) {
  const router = useRouter();
  const [showDiscord, setShowDiscord] = useState(initialShowDiscord);
  const [pending, setPending] = useState(false);

  async function toggleVisibility() {
    if (pending) return;

    setPending(true);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showDiscord: !showDiscord,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось изменить видимость Discord");
      }

      const data: { showDiscord: boolean } = await response.json();

      setShowDiscord(data.showDiscord);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Не удалось изменить видимость Discord. Попробуй ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size="icon"
      variant="outline"
      title={
        showDiscord ? "Скрыть Discord из профиля" : "Показать Discord в профиле"
      }
      aria-label={
        showDiscord ? "Скрыть Discord из профиля" : "Показать Discord в профиле"
      }
      disabled={pending}
      onClick={toggleVisibility}
    >
      {showDiscord ? (
        <EyeIcon weight="bold" />
      ) : (
        <EyeClosedIcon weight="bold" />
      )}
    </Button>
  );
}
