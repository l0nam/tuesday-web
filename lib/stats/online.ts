import { asc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { onlineSample } from "@/lib/db/schema";
import { SERVER_IP } from "@/lib/data";

export const ONLINE = {
  sampleMinutes: 10,
  checkEveryMinutes: 5,
  historyDays: 7,
} as const;

export interface ServerStatus {
  online: boolean;
  players: number;
  max: number;
}

export async function fetchServerStatus(
  options: { fresh?: boolean } = {},
): Promise<ServerStatus | null> {
  try {
    const cacheOptions = options.fresh
      ? { cache: "no-store" as const }
      : { next: { revalidate: 300 } };
    const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_IP}`, {
      headers: {
        "User-Agent": "Tuesday-Website/1.0 (tuesday-prime.ru)",
        Accept: "application/json",
      },
      ...cacheOptions,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      online?: boolean;
      players?: { online?: number; max?: number };
    };
    return {
      online: Boolean(data.online),
      players: data.players?.online ?? 0,
      max: data.players?.max ?? 0,
    };
  } catch {
    return null;
  }
}

export function bucketStart(date: Date = new Date()): Date {
  const step = ONLINE.sampleMinutes * 60_000;
  return new Date(Math.floor(date.getTime() / step) * step);
}

const g = globalThis as unknown as {
  __tuesdaySampler?: NodeJS.Timeout;
};

export async function recordOnlineSample(
  status?: ServerStatus | null,
): Promise<void> {
  const bucket = bucketStart();

  // The database primary key deduplicates samples for a bucket. Do not rely on
  // process memory: Vercel Functions can run in different short-lived instances.
  const current =
    status === undefined ? await fetchServerStatus({ fresh: true }) : status;
  if (!current) return;

  const online = current.online ? current.players : 0;
  await db
    .insert(onlineSample)
    .values({ bucket, online })
    .onDuplicateKeyUpdate({ set: { online } });
}

export function startOnlineSampler(): void {
  if (g.__tuesdaySampler) return;
  const tick = () =>
    recordOnlineSample().catch((error) =>
      console.error("[stats] не удалось записать онлайн:", error),
    );
  tick();
  g.__tuesdaySampler = setInterval(tick, ONLINE.checkEveryMinutes * 60_000);
  g.__tuesdaySampler.unref();
}

export interface OnlinePoint {
  t: number;
  v: number;
}

export async function getOnlineHistory(
  days: number = ONLINE.historyDays,
): Promise<{ points: OnlinePoint[]; now: number }> {
  const now = Date.now();
  const since = new Date(now - days * 86_400_000);
  const rows = await db
    .select()
    .from(onlineSample)
    .where(gte(onlineSample.bucket, since))
    .orderBy(asc(onlineSample.bucket));
  return {
    points: rows.map((r) => ({ t: r.bucket.getTime(), v: r.online })),
    now,
  };
}
