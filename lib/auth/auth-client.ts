import { createAuthClient } from "better-auth/react";

/** Клиент Better Auth для браузера (тот же origin, baseURL не нужен). */
export const authClient = createAuthClient();

/** Запускает вход через Discord. После входа пользователь попадёт на callbackURL. */
export function signInWithDiscord(callbackURL = "/profile") {
  return authClient.signIn.social({ provider: "discord", callbackURL });
}

export function signOut() {
  return authClient.signOut();
}
