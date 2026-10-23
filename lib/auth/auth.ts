import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { ensurePlayer } from "@/lib/player";

function createAuth() {
  const env = getEnv();

  return betterAuth({
    appName: "Tuesday",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    database: drizzleAdapter(getDb(), {
      provider: "mysql",
      schema: { user, session, account, verification },
    }),

    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    databaseHooks: {
      account: {
        create: {
          after: async (created) => {
            if (created.providerId !== "discord") return;
            try {
              await ensurePlayer(created.userId, created.accountId);
            } catch (error) {
              console.error(
                "[auth] не удалось создать игрока после входа:",
                error,
              );
            }
          },
        },
      },
    },

    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const g = globalThis as unknown as { __tuesdayAuth?: Auth };

export function getAuth(): Auth {
  g.__tuesdayAuth ??= createAuth();
  return g.__tuesdayAuth;
}
