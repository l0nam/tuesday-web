import { siteTimezone } from "./time";

export function formatCurrency(n: number, short?: boolean) {
  if (short) return "Вт.";

  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "Вторничек";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "Вторничка";
  }
  return "Вторничков";
}

export function formatNumber(value: number, short = false): string {
  if (!Number.isFinite(value)) return "0";

  if (!short) {
    return new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 20,
      useGrouping: true,
    })
      .format(value)
      .replace(/\u00A0|\u202F/g, " ");
  }

  const abs = Math.abs(value);
  const units = [
    { threshold: 1e12, suffix: "трлн" },
    { threshold: 1e9, suffix: "млрд" },
    { threshold: 1e6, suffix: "млн" },
    { threshold: 1e3, suffix: "т" },
  ];

  const unit = units.find(({ threshold }) => abs >= threshold);

  if (!unit) return String(value);

  const formatted = (value / unit.threshold)
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(".", ",");

  return `${formatted}${unit.suffix}`;
}

export function formatDate(value: string | Date | null) {
  if (!value) return "—";

  const tz = siteTimezone();
  const date = value instanceof Date ? value : new Date(value);

  return date.toLocaleDateString("ru-RU", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
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

const HEX32 = /^[0-9a-f]{32}$/;

export const MC_NAME_RE = /^[A-Za-z0-9_.]{1,32}$/;

export function normalizeUuid(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/-/g, "");
  return HEX32.test(s) ? s : null;
}

export function formatUuid(uuid32: string): string {
  return `${uuid32.slice(0, 8)}-${uuid32.slice(8, 12)}-${uuid32.slice(12, 16)}-${uuid32.slice(16, 20)}-${uuid32.slice(20)}`;
}
