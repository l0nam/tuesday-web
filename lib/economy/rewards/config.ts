export const ACHIEVEMENT_DIFFICULTIES = [
  "easy",
  "normal",
  "hard",
  "legendary",
] as const;
export type AchievementDifficulty = (typeof ACHIEVEMENT_DIFFICULTIES)[number];

export const REWARDS = {
  achievement: {
    easy: 5,
    normal: 15,
    hard: 40,
    legendary: 100,
  } satisfies Record<AchievementDifficulty, number>,

  city: {
    minMembers: 10,
    amount: 150,
  },

  playtime: {
    secondsPerUnit: 3600,
    amountPerUnit: 5,
    grantExistingTime: false,
    maxUnitsPerEvent: 24,
  },

  activity: {
    event: 25,
    contest: 40,
    quest: 15,
    vote: 5,
  } as Record<string, number>,

  customActivityMax: 500,
} as const;

export const ACTIVITY_CODES = Object.keys(REWARDS.activity);
