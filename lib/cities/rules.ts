import { REWARDS } from "@/lib/economy/rewards/config";
import { BANNER_MAX_LAYERS } from "@/lib/cities/banner";

/**
 * Правила городов. Меняйте значения здесь, больше нигде ничего трогать не нужно.
 * Размер награды за 10 жителей лежит вместе с остальными наградами: lib/economy/rewards/config.ts (REWARDS.city).
 */
export const CITY = {
  nameMin: 3,
  nameMax: 32,
  descriptionMax: 300,
  /** Сообщение игрока в заявке */
  messageMax: 300,
  /** Причина отказа: обязательна, чтобы игрок понимал, что исправить */
  reasonMin: 3,
  reasonMax: 300,
  /** Сколько заявок в разные города игрок может держать одновременно (защита от рассылки) */
  maxPendingApplications: 3,
  /** Через сколько часов после отказа можно подать заявку в тот же город снова */
  reapplyCooldownHours: 24,
  bannerMaxLayers: BANNER_MAX_LAYERS,
  /** Сколько жителей нужно городу, чтобы владелец получил награду (один раз за все города) */
  rewardMinMembers: REWARDS.city.minMembers,
  rewardAmount: REWARDS.city.amount,
} as const;

/** Буквы любого алфавита, цифры и несколько знаков препинания; начинается с буквы или цифры. */
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.'!?()|&+-]*$/u;

/** Убирает лишние пробелы по краям и внутри. */
export function normalizeCityName(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Ключ для проверки уникальности: без регистра, "ё" = "е". */
export function cityNameKey(name: string): string {
  return normalizeCityName(name).toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

export function validateCityName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = normalizeCityName(raw);
  const length = Array.from(name).length;
  if (length < CITY.nameMin) return { ok: false, error: `Название должно быть не короче ${CITY.nameMin} символов` };
  if (length > CITY.nameMax) return { ok: false, error: `Название должно быть не длиннее ${CITY.nameMax} символов` };
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error: "Название может содержать буквы, цифры, пробелы и знаки _ . ' ! ? ( ) | & + -",
    };
  }
  return { ok: true, name };
}

const DISCORD_INVITE_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,32})\/?(?:[?#].*)?$/i;

/**
 * Приводит ссылку-приглашение Discord к виду https://discord.gg/<код>.
 * Пустая строка = ссылки нет. Любые другие адреса отклоняются, чтобы со страницы города
 * нельзя было увести людей на постороннюю ссылку.
 */
export function normalizeDiscordUrl(raw: string): { ok: true; url: string | null } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: true, url: null };
  const match = DISCORD_INVITE_RE.exec(text);
  if (!match) {
    return { ok: false, error: "Нужна ссылка-приглашение Discord, например https://discord.gg/abcdef" };
  }
  return { ok: true, url: `https://discord.gg/${match[1]}` };
}

export const CITY_ROLE_TITLES = {
  owner: "Владелец",
  coowner: "Совладелец",
  member: "Житель",
} as const;
