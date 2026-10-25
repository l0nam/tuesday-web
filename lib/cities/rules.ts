import { REWARDS } from "@/lib/economy/rewards/config";
import { BANNER_MAX_LAYERS } from "@/lib/cities/banner";

export const CITY = {
  nameMin: 3,
  nameMax: 32,
  descriptionMax: 300,
  messageMax: 300,
  reasonMin: 3,
  reasonMax: 300,
  maxPendingApplications: 3,
  reapplyCooldownHours: 24,
  bannerMaxLayers: BANNER_MAX_LAYERS,
  rewardMinMembers: REWARDS.city.minMembers,
  rewardAmount: REWARDS.city.amount,
} as const;

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.'!?()|&+-]*$/u;

export function normalizeCityName(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function cityNameKey(name: string): string {
  return normalizeCityName(name).toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

export function validateCityName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = normalizeCityName(raw);
  const length = Array.from(name).length;
  if (length < CITY.nameMin)
    return {
      ok: false,
      error: `Название должно быть не короче ${CITY.nameMin} символов`,
    };
  if (length > CITY.nameMax)
    return {
      ok: false,
      error: `Название должно быть не длиннее ${CITY.nameMax} символов`,
    };
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error:
        "Название может содержать буквы, цифры, пробелы и знаки _ . ' ! ? ( ) | & + -",
    };
  }
  return { ok: true, name };
}

const DISCORD_INVITE_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,32})\/?(?:[?#].*)?$/i;

export function normalizeDiscordUrl(
  raw: string,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: true, url: null };
  const match = DISCORD_INVITE_RE.exec(text);
  if (!match) {
    return {
      ok: false,
      error:
        "Нужна ссылка-приглашение Discord, например https://discord.gg/abcdef",
    };
  }
  return { ok: true, url: `https://discord.gg/${match[1]}` };
}

export const CITY_ROLE_TITLES = {
  owner: "Владелец",
  coowner: "Совладелец",
  member: "Участник",
} as const;
