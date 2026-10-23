"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountPayload } from "@/lib/utils/account";
import {
  signInWithDiscord,
  signOut as authSignOut,
} from "@/lib/auth/auth-client";

type AccountState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "error" }
  | {
      status: "authed";
      user: AccountPayload["user"];
      player: AccountPayload["player"];
      link: AccountPayload["link"];
      claimed: AccountPayload["claimed"];
      city: AccountPayload["city"];
      canAccessAdmin: AccountPayload["canAccessAdmin"];
    };

let inflight: Promise<AccountState> | null = null;

function fetchAccount(): Promise<AccountState> {
  inflight ??= loadAccount().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function loadAccount(): Promise<AccountState> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as
      | AccountPayload
      | { authenticated: false };
    if (!data.authenticated) return { status: "guest" };
    return {
      status: "authed",
      user: data.user,
      player: data.player,
      link: data.link,
      claimed: data.claimed,
      city: data.city,
      canAccessAdmin: data.canAccessAdmin,
    };
  } catch {
    return { status: "error" };
  }
}

export function useAccount() {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void fetchAccount().then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const handleRefresh = () => {
      setReloadKey((key) => key + 1);
    };
    window.addEventListener("account:refresh", handleRefresh);
    return () => {
      window.removeEventListener("account:refresh", handleRefresh);
    };
  }, []);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  const signIn = useCallback(() => {
    void signInWithDiscord("/profile");
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setState({ status: "guest" });
  }, []);

  return {
    ...state,
    balance: state.status === "authed" ? state.player.balance : null,
    refresh,
    signIn,
    signOut,
  };
}
