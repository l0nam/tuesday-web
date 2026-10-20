"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatNumber, formatСurrency } from "@/lib/utils/formatting";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  itemId: number;
  price: number;
  disabledReason?: string;
};

export function BuyButton({ itemId, price, disabledReason }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  async function buy() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = (await res.json()) as { error?: { message: string } };
      if (res.ok) {
        setMessage({
          text: "Куплено! Предмет появится в игре в течение минуты.",
          ok: true,
        });
      } else {
        setMessage({
          text: data.error?.message ?? "Не удалось купить",
          ok: false,
        });
      }
      router.refresh();
    } catch {
      setMessage({ text: "Нет связи с сервером", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        onClick={buy}
        title={disabledReason}
        disabled={busy || Boolean(disabledReason)}
        className="w-full"
      >
        {busy ? (
          <>
            <Spinner /> Покупаем…
          </>
        ) : (
          `Купить за ${formatNumber(price, true)} ${formatСurrency(price, true)}`
        )}
      </Button>

      {message && (
        <p
          className={cn(
            "text-xs mt-2",
            message.ok ? "text-primary" : "text-destructive",
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
