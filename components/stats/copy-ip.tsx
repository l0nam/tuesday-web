"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { SERVER_IP } from "@/lib/data";
import { Button } from "../ui/button";

export function CopyIp({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      setCopied(true);
    } catch {
      // Буфер недоступен
    }
  }

  return (
    <Button
      onClick={copy}
      aria-label={`Скопировать IP сервера ${SERVER_IP}`}
      className={className}
      variant="secondary"
      size="sm"
    >
      {copied ? (
        <CheckIcon className="size-4 text-primary" weight="bold" />
      ) : (
        <CopyIcon className="size-4" weight="bold" />
      )}

      <span className={cn(!copied && "font-minecraft")}>
        {copied ? "Скопировано!" : SERVER_IP}
      </span>
    </Button>
  );
}
