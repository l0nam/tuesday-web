import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcProfile } from "@/lib/db/schema";
import { MC_NAME_RE } from "@/lib/minecraft/uuid";

/** Запоминает ник игрока (источник: событие плагина или Mojang). */
export async function rememberName(mcUuid: string, name: string) {
  if (!MC_NAME_RE.test(name)) return;
  await db
    .insert(mcProfile)
    .values({ mcUuid, name })
    .onDuplicateKeyUpdate({ set: { name, updatedAt: new Date() } });
}

async function fetchMojangName(mcUuid: string): Promise<string | null> {
  try {
    const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${mcUuid}`, {
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: unknown };
    return typeof data.name === "string" && MC_NAME_RE.test(data.name) ? data.name : null;
  } catch {
    return null;
  }
}

/**
 * Ник по UUID: сначала из своей БД (его присылает плагин), затем из Mojang.
 * Для серверов в offline-режиме Mojang ничего не знает, тогда вернётся null.
 */
export async function resolveName(mcUuid: string): Promise<string | null> {
  const [known] = await db.select({ name: mcProfile.name }).from(mcProfile).where(eq(mcProfile.mcUuid, mcUuid)).limit(1);
  if (known) return known.name;

  const fromMojang = await fetchMojangName(mcUuid);
  if (fromMojang) await rememberName(mcUuid, fromMojang);
  return fromMojang;
}
