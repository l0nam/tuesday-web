"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/auth/use-account";
import { Navbar } from "@/components/navbar";
import { WalletSection } from "@/components/landing/wallet-section";

export function ConnectedNavbar() {
  const account = useAccount();
  const router = useRouter();

  return (
    <Suspense fallback={null}>
      <Navbar
        balance={account.balance}
        user={account.status === "authed" ? account.user : null}
        player={account.status === "authed" ? account.player : null}
        city={
          account.status === "authed" && account.city
            ? {
                name: account.city.name,
                href: `/cities/${account.city.id}`,
              }
            : null
        }
        canAccessAdmin={account.status === "authed" && account.canAccessAdmin}
        onAuthClick={() =>
          account.status === "authed"
            ? router.push("/profile")
            : account.signIn()
        }
      />
    </Suspense>
  );
}

export function ConnectedWalletSection() {
  const account = useAccount();

  return (
    <WalletSection
      balance={account.balance}
      shopHref="/shop"
      onAuthClick={account.signIn}
    />
  );
}
