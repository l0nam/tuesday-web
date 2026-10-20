/**
 * Настройки публичного профиля игрока. Меняйте значения здесь.
 */

export const PROFILE = {
  /** Сколько недель показывает тепловая карта активности */
  heatmapWeeks: 26,

  /** Игрок считается онлайн, если плагин сообщал о нём не позже, чем N секунд назад */
  onlineWindowSeconds: 10 * 60,

  /**
   * Если между двумя отчётами плагина о времени прошло больше игрового времени, чем это значение
   * (например, плагин долго не работал), прирост не относится к конкретным дням.
   */
  maxAttributedDeltaSeconds: 12 * 60 * 60,

  /** Максимальная длина описания профиля (символов) */
  bioMaxLength: 512,

  /** Показывать баланс Вторничков всем посетителям (true) или только владельцу профиля (false) */
  balancePublic: true,

  /** Как часто (в секундах) обновлять роли и Discord-ник игрока из Discord */
  discordCacheSeconds: 10 * 60,

  /**
   * Не больше стольких обновлений данных Discord в минуту на весь сайт (защита от лимитов Discord и от
   * обхода всех профилей подряд). Лишние откладываются: профиль покажет прежние данные, обновление пройдёт позже.
   */
  discordMaxRefreshesPerMinute: 30,

  /** "all": все подходящие роли рядом с ником; "highest": только самая старшая из ROLE_BADGES */
  rolesMode: "all" as "all" | "highest",
} as const;

/**
 * Донат-статусы (подписки), которые показывает профиль. Ключ - значение поля `tier`
 * в событии `donate` от плагина. Добавьте свои.
 */
export const DONATE_TIERS: Record<string, { name: string }> = {
  plus: { name: "Plus" },
  gold: { name: "Gold" },
};

/**
 * Роли из Discord, которые показываются в профиле (остальные роли сервера игнорируются).
 * Порядок важен: сверху вниз по старшинству. `envKey` - переменная окружения с ID роли в Discord
 * (ID: Настройки сервера → Роли → ПКМ по роли → «Копировать ID роли», нужен режим разработчика).
 */
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

/**
 * Как показывать роль игрока в городе (значение поля role в событии city_membership).
 * Роли, которых здесь нет, показываются как прислал плагин.
 */
export const CITY_ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  coowner: "Совладелец",
  member: "Житель",
};
