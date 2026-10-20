import { getEnv } from "@/lib/env";

/**
 * Работа с календарными днями в часовом поясе сайта (SITE_TIMEZONE).
 * «День» везде это строка YYYY-MM-DD.
 */

export function siteTimezone(): string {
  return getEnv().SITE_TIMEZONE;
}

/** Календарный день момента времени в часовом поясе сайта. */
export function dayKey(date: Date, timeZone: string = siteTimezone()): string {
  // Локаль en-CA форматирует дату как YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Сколько секунд прошло с полуночи (в часовом поясе сайта) до указанного момента. */
export function secondsSinceMidnight(date: Date, timeZone: string = siteTimezone()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 3600 + get("minute") * 60 + get("second");
}

/** Номер дня от эпохи (для арифметики с днями без часовых поясов). */
export function epochDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** День недели, понедельник = 0 ... воскресенье = 6. */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
