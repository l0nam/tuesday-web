import { asc, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { onlineSample } from "@/lib/db/schema";
import { SERVER_IP } from "@/lib/data";

/**
 * Онлайн сервера для страницы /stats.
 * Раз в 10 минут берём число игроков с mcsrvstat и сохраняем один замер в online_sample.
 */
export const ONLINE = {
  /** Шаг графика: один замер на такое окно (минуты) */
  sampleMinutes: 10,
  /** Как часто фоновая задача проверяет, не пора ли делать новый замер (минуты) */
  checkEveryMinutes: 5,
  /** Сколько дней истории отдаём графику */
  historyDays: 7,
} as const;

export interface ServerStatus {
  online: boolean;
  players: number;
  max: number;
}

/** Статус сервера. Тот же адрес и заголовки, что у /api/status, поэтому ответ берётся из общего кэша Next. */
export async function fetchServerStatus(): Promise<ServerStatus | null> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_IP}`, {
      headers: { "User-Agent": "Tuesday-Website/1.0 (tuesday-prime.ru)", Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { online?: boolean; players?: { online?: number; max?: number } };
    return { online: Boolean(data.online), players: data.players?.online ?? 0, max: data.players?.max ?? 0 };
  } catch {
    return null;
  }
}

/** Начало 10-минутного окна, в которое попадает момент времени. */
export function bucketStart(date: Date = new Date()): Date {
  const step = ONLINE.sampleMinutes * 60_000;
  return new Date(Math.floor(date.getTime() / step) * step);
}

const g = globalThis as unknown as { __tuesdayLastBucket?: number; __tuesdaySampler?: NodeJS.Timeout };

/**
 * Записывает замер за текущее окно, если его ещё нет. Безопасно вызывать сколько угодно раз:
 * за окно делается один запрос к mcsrvstat и одна запись. Если статус получить не удалось,
 * замер пропускается (на графике будет разрыв, а не ложный ноль).
 */
export async function recordOnlineSample(status?: ServerStatus | null): Promise<void> {
  const bucket = bucketStart();
  if (g.__tuesdayLastBucket === bucket.getTime()) return;

  const current = status === undefined ? await fetchServerStatus() : status;
  if (!current) return;

  const online = current.online ? current.players : 0;
  await db.insert(onlineSample).values({ bucket, online }).onDuplicateKeyUpdate({ set: { online } });
  g.__tuesdayLastBucket = bucket.getTime();
}

/** Фоновый замер для постоянно работающего сервера (запускается из instrumentation.ts). */
export function startOnlineSampler(): void {
  if (g.__tuesdaySampler) return;
  const tick = () => recordOnlineSample().catch((error) => console.error("[stats] не удалось записать онлайн:", error));
  tick();
  g.__tuesdaySampler = setInterval(tick, ONLINE.checkEveryMinutes * 60_000);
  g.__tuesdaySampler.unref();
}

export interface OnlinePoint {
  /** Начало окна замера, мс от эпохи */
  t: number;
  /** Игроков на сервере */
  v: number;
}

/** Замеры за последние дни и момент, относительно которого они отсчитаны (для оси времени графика). */
export async function getOnlineHistory(days: number = ONLINE.historyDays): Promise<{ points: OnlinePoint[]; now: number }> {
  const now = Date.now();
  const since = new Date(now - days * 86_400_000);
  const rows = await db
    .select()
    .from(onlineSample)
    .where(gte(onlineSample.bucket, since))
    .orderBy(asc(onlineSample.bucket));
  return { points: rows.map((r) => ({ t: r.bucket.getTime(), v: r.online })), now };
}
