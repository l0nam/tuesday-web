import { z } from "zod";

const identifier = z
  .string()
  .regex(/^[A-Za-z0-9_]{1,64}$/, "только латиница, цифры и _");

const sslMode = z.enum(["false", "true", "no-verify"]);

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: sslMode.default("false"),

  DISCORDSRV_DATABASE_URL: z.string().min(1).optional(),
  DISCORDSRV_DATABASE_SSL: sslMode.optional(),
  DISCORDSRV_TABLE: identifier.default("discordsrv_accounts"),
  DISCORDSRV_DISCORD_COLUMN: identifier.default("discord"),
  DISCORDSRV_UUID_COLUMN: identifier.default("uuid"),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "минимум 32 символа (openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.url(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),

  PLUGIN_API_SECRET: z
    .string()
    .min(32, "минимум 32 символа (openssl rand -hex 32)"),

  SITE_TIMEZONE: z
    .string()
    .default("Europe/Moscow")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "неизвестный часовой пояс (пример: Europe/Moscow)"),

  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().regex(/^\d+$/).optional(),
  DISCORD_ROLE_ADMIN_ID: z.string().regex(/^\d+$/).optional(),
  DISCORD_ROLE_MODERATOR_ID: z.string().regex(/^\d+$/).optional(),
  DISCORD_ROLE_PLAYER_ID: z.string().regex(/^\d+$/).optional(),
  DISCORD_API_BASE: z.url().default("https://discord.com/api/v10"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Некорректные переменные окружения:\n${z.prettifyError(parsed.error)}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function sslOption(mode: "false" | "true" | "no-verify" | undefined) {
  if (mode === "true") return { rejectUnauthorized: true };
  if (mode === "no-verify") return { rejectUnauthorized: false };
  return undefined;
}
