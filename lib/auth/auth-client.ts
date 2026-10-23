import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export function signInWithDiscord(callbackURL = "/profile") {
  return authClient.signIn.social({ provider: "discord", callbackURL });
}

export function signOut() {
  return authClient.signOut();
}
