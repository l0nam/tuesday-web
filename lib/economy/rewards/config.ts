export const ACHIEVEMENT_TIERS = [
  "task",
  "goal",
  "challenge",
] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

// Legacy difficulty values accepted from older plugin builds.
export const ACHIEVEMENT_DIFFICULTIES = [
  "easy",
  "normal",
  "hard",
  "legendary",
] as const;
export type AchievementDifficulty = (typeof ACHIEVEMENT_DIFFICULTIES)[number];

export const REWARDS = {
  achievement: {
    task: 5,
    goal: 40,
    challenge: 100,
  } satisfies Record<AchievementTier, number>,

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
