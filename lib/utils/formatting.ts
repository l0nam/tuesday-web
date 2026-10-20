import { siteTimezone } from "./time";

export function formatСurrency(n: number, short?: boolean) {
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

export function formatDate(date: Date) {
  const tz = siteTimezone();

  return date.toLocaleDateString("ru-RU", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
