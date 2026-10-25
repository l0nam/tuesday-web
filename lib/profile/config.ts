/**
 * Настройки публичного профиля игрока. Меняйте значения здесь.
 */

export const PROFILE = {
  heatmapWeeks: 26,
  onlineWindowSeconds: 10 * 60,
  maxAttributedDeltaSeconds: 12 * 60 * 60,
  bioMaxLength: 512,
  balancePublic: true,
  discordCacheSeconds: 10 * 60,
  discordMaxRefreshesPerMinute: 30,
  rolesMode: "all" as "all" | "highest",
} as const;

export const DONATE_TIERS: Record<string, { name: string }> = {
  plus: { name: "Plus" },
  gold: { name: "Gold" },
};

export const ROLE_BADGES = [
  {
    key: "admin",
    label: "Администратор",
    envKey: "DISCORD_ROLE_ADMIN_ID",
    tone: "admin",
  },
  {
    key: "moderator",
    label: "Модератор",
    envKey: "DISCORD_ROLE_MODERATOR_ID",
    tone: "moderator",
  },
  {
    key: "player",
    label: "Игрок",
    envKey: "DISCORD_ROLE_PLAYER_ID",
    tone: "player",
  },
] as const;

export type RoleKey = (typeof ROLE_BADGES)[number]["key"];
export type RoleTone = (typeof ROLE_BADGES)[number]["tone"];

export const CITY_ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  coowner: "Совладелец",
  member: "Участник",
};
