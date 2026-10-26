import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appSetting } from "@/lib/db/schema";
import { REWARDS } from "./config";

const rewardAmount = z.number().int().min(0).max(1_000_000);

export const rewardSettingsSchema = z
  .object({
    achievement: z.object({
      task: rewardAmount,
      goal: rewardAmount,
      challenge: rewardAmount,
    }),
    city: z.object({
      minMembers: z.number().int().min(1).max(100_000),
      amount: rewardAmount,
    }),
    playtime: z.object({
      secondsPerUnit: z.number().int().min(1).max(31_536_000),
      amountPerUnit: rewardAmount,
      grantExistingTime: z.boolean(),
      maxUnitsPerEvent: z.number().int().min(1).max(10_000),
    }),
    activity: z.object({
      event: rewardAmount,
      contest: rewardAmount,
      quest: rewardAmount,
      vote: rewardAmount,
    }),
    customActivityMax: z.number().int().min(1).max(1_000_000),
  })
  .strict();

export type RewardSettings = z.infer<typeof rewardSettingsSchema>;

export const editableRewardSettingsSchema = z
  .object({
    achievement: z.object({
      task: rewardAmount,
      goal: rewardAmount,
      challenge: rewardAmount,
    }),
    city: z.object({
      minMembers: z.number().int().min(1).max(100_000),
      amount: rewardAmount,
    }),
    playtime: z.object({ amountPerUnit: rewardAmount }),
    activity: z.object({
      event: rewardAmount,
      contest: rewardAmount,
      quest: rewardAmount,
      vote: rewardAmount,
    }),
    customActivityMax: z.number().int().min(1).max(1_000_000),
  })
  .strict();

export type EditableRewardSettings = z.infer<
  typeof editableRewardSettingsSchema
>;

export const REWARD_SETTING_KEY = "reward_settings";

export const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  achievement: { ...REWARDS.achievement },
  city: { ...REWARDS.city },
  playtime: { ...REWARDS.playtime },
  activity: {
    event: REWARDS.activity.event,
    contest: REWARDS.activity.contest,
    quest: REWARDS.activity.quest,
    vote: REWARDS.activity.vote,
  },
  customActivityMax: REWARDS.customActivityMax,
};

export function parseRewardSettings(value: unknown): RewardSettings {
  const parsed = rewardSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_REWARD_SETTINGS;
}

export function toEditableRewardSettings(
  settings: RewardSettings,
): EditableRewardSettings {
  return {
    achievement: { ...settings.achievement },
    city: { ...settings.city },
    playtime: { amountPerUnit: settings.playtime.amountPerUnit },
    activity: { ...settings.activity },
    customActivityMax: settings.customActivityMax,
  };
}

export function applyEditableRewardSettings(
  previous: RewardSettings,
  editable: EditableRewardSettings,
): RewardSettings {
  return {
    ...previous,
    achievement: { ...editable.achievement },
    city: { ...editable.city },
    playtime: {
      ...previous.playtime,
      amountPerUnit: editable.playtime.amountPerUnit,
    },
    activity: { ...editable.activity },
    customActivityMax: editable.customActivityMax,
  };
}

export async function getRewardSettings(): Promise<RewardSettings> {
  const [row] = await db
    .select({ value: appSetting.value })
    .from(appSetting)
    .where(eq(appSetting.key, REWARD_SETTING_KEY))
    .limit(1);

  return row ? parseRewardSettings(row.value) : DEFAULT_REWARD_SETTINGS;
}
