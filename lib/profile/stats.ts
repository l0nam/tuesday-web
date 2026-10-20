import { PROFILE } from "@/lib/profile/config";
import {
  addDays,
  dayKey,
  epochDay,
  secondsSinceMidnight,
  weekdayIndex,
} from "@/lib/utils/time";

export interface DayRow {
  day: string;
  seconds: number;
}

export function computeStreak(
  visitedDays: Iterable<string>,
  today: string,
): { current: number; best: number } {
  const days = new Set(visitedDays);
  if (days.size === 0) return { current: 0, best: 0 };

  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...days].map(epochDay).sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

export function windowSeconds(
  rows: DayRow[],
  today: string,
  days: number,
): number {
  const from = addDays(today, -(days - 1));
  let total = 0;
  for (const row of rows) {
    if (row.day >= from && row.day <= today) total += row.seconds;
  }
  return total;
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(seconds: number): HeatLevel {
  if (seconds <= 0) return 0;
  if (seconds < 3600) return 1;
  if (seconds < 3 * 3600) return 2;
  if (seconds < 6 * 3600) return 3;
  return 4;
}

export interface HeatCell {
  day: string;
  seconds: number;
  level: HeatLevel;
  inFuture: boolean;
}

export function buildHeatmap(
  rows: DayRow[],
  today: string,
  weeks: number = PROFILE.heatmapWeeks,
): HeatCell[][] {
  const seconds = new Map(rows.map((r) => [r.day, r.seconds]));
  const currentWeekStart = addDays(today, -weekdayIndex(today));
  const firstDay = addDays(currentWeekStart, -(weeks - 1) * 7);

  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const day = addDays(firstDay, w * 7 + d);
      const value = seconds.get(day) ?? 0;
      column.push({
        day,
        seconds: value,
        level: heatLevel(value),
        inFuture: day > today,
      });
    }
    columns.push(column);
  }
  return columns;
}

export function isOnline(
  stats: { online: boolean; lastSeenAt: Date | null } | null,
  now: Date = new Date(),
  windowSeconds: number = PROFILE.onlineWindowSeconds,
): boolean {
  if (!stats || !stats.online || !stats.lastSeenAt) return false;
  return now.getTime() - stats.lastSeenAt.getTime() <= windowSeconds * 1000;
}

export function splitAcrossMidnight(
  delta: number,
  previousAt: Date,
  now: Date,
  timeZone?: string,
): { day: string; seconds: number }[] {
  const today = dayKey(now, timeZone);
  const previousDay = dayKey(previousAt, timeZone);
  if (today === previousDay) return [{ day: today, seconds: delta }];

  const todayPart = Math.min(delta, secondsSinceMidnight(now, timeZone));
  const parts = [{ day: today, seconds: todayPart }];
  if (delta - todayPart > 0)
    parts.push({ day: previousDay, seconds: delta - todayPart });
  return parts;
}

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}

export function formatAgo(from: Date, now: Date = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - from.getTime()) / 1000),
  );
  if (seconds < 60) return "только что";
  if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return rtf.format(-Math.floor(seconds / 3600), "hour");
  return rtf.format(-Math.floor(seconds / 86_400), "day");
}

export function pluralRu(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}
