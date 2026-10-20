"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PlayerHeadProps = {
  nickname?: string | null;
  size?: number;
  className?: string;
};

export function PlayerHead({
  nickname,
  size = 64,
  className,
}: PlayerHeadProps) {
  const [hasError, setHasError] = useState(false);

  const normalizedNickname = nickname?.trim() ?? "";

  useEffect(() => {
    setHasError(false);
  }, [normalizedNickname]);

  const src =
    hasError || !normalizedNickname
      ? `https://mc-heads.net/avatar/c06f89064c8a49119c29ea1dbd1aab82/${size}`
      : `/api/minecraft/head/${encodeURIComponent(normalizedNickname)}`;

  return (
    <Image
      src={src}
      alt={
        normalizedNickname
          ? `Голова игрока ${normalizedNickname}`
          : "Голова игрока"
      }
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn("select-none", className)}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
    />
  );
}
