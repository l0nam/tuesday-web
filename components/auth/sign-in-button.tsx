"use client";

import { signInWithDiscord } from "@/lib/auth/auth-client";
import { Button } from "../ui/button";

export function SignInButton({
  callbackURL = "/profile",
  label = "Войти через Discord",
}: {
  callbackURL?: string;
  label?: string;
}) {
  return (
    <Button onClick={() => void signInWithDiscord(callbackURL)}>{label}</Button>
  );
}
