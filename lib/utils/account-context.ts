import { getMembership } from "@/lib/cities/queries";
import {
  getPermissionsForIdentity,
  resolveAdminIdentity,
} from "@/lib/admin/access";

export type AccountContext = {
  city: {
    id: number;
    name: string;
  } | null;
  canAccessAdmin: boolean;
};

export async function getAccountContext(
  userId: string,
): Promise<AccountContext> {
  const [membership, canAccessAdmin] = await Promise.all([
    getMembership(userId),
    (async () => {
      try {
        const resolved = await resolveAdminIdentity(userId);

        if (!resolved.ok) return false;

        const permissions = await getPermissionsForIdentity(resolved.identity);

        return permissions.has("dashboard.read");
      } catch {
        return false;
      }
    })(),
  ]);

  return {
    city: membership
      ? {
          id: membership.cityId,
          name: membership.cityName,
        }
      : null,
    canAccessAdmin,
  };
}
