/**
 * Размеры наград в Вторничках. Меняйте значения здесь, больше нигде ничего трогать не нужно.
 * Награды считает сайт, плагин лишь сообщает о событии (так цифры можно менять без обновления плагина).
 */

export const ACHIEVEMENT_DIFFICULTIES = [
  "easy",
  "normal",
  "hard",
  "legendary",
] as const;
export type AchievementDifficulty = (typeof ACHIEVEMENT_DIFFICULTIES)[number];

export const REWARDS = {
  /** Достижения в игре: награда зависит от сложности. Каждое достижение оплачивается игроку один раз. */
  achievement: {
    easy: 5,
    normal: 15,
    hard: 40,
    legendary: 100,
  } satisfies Record<AchievementDifficulty, number>,

  /** Владение городом от minMembers человек. Выдаётся ОДИН раз на игрока за все города. */
  city: {
    minMembers: 10,
    amount: 150,
  },

  /** Наигранное время: amountPerUnit за каждые secondsPerUnit секунд. */
  playtime: {
    secondsPerUnit: 3600,
    amountPerUnit: 5,
    /**
     * false: время, наигранное ДО подключения сайта, не оплачивается (первое событие игрока
     * лишь запоминает отправную точку). true: при первом событии оплатится вся история.
     */
    grantExistingTime: false,
    /** Защита от ошибок плагина: за одно событие оплачивается не больше стольких единиц */
    maxUnitsPerEvent: 24,
  },

  /** Участие в жизни сервера. Ключ - код активности, который присылает плагин. */
  activity: {
    event: 25, // участие в ивенте
    contest: 40, // конкурс (строительство, PvP-турнир и т.п.)
    quest: 15, // выполнение сюжетного/городского квеста
    vote: 5, // голосование за сервер
  } as Record<string, number>,

  /** Максимум для активности с кодом "custom", где сумму указывает плагин */
  customActivityMax: 500,
} as const;

export const ACTIVITY_CODES = Object.keys(REWARDS.activity);
