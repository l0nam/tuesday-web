"use client";

import { cn } from "cn";
import Image from "next/image";
import { useState } from "react";

type PlayerHeadProps = {
  nickname: string;
  size?: number;
  className?: string;
};

export function PlayerHead({
  nickname,
  size = 64,
  className,
}: PlayerHeadProps) {
  const [hasError, setHasError] = useState(false);

  const src = hasError
    ? `https://mc-heads.net/avatar/c06f89064c8a49119c29ea1dbd1aab82/${size}`
    : `https://mc-heads.net/avatar/${encodeURIComponent(nickname)}/${size}`;

  return (
    <Image
      src={src}
      alt={`Голова игрока ${nickname}`}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn("select-none", className)}
      onError={() => setHasError(true)}
    />
  );
}
