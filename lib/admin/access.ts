import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  account,
  adminRole,
  adminRolePermission,
  player,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { fetchGuildMember } from "@/lib/profile/discord";
import { errorResponse } from "@/lib/utils/http";

export const ADMIN_PERMISSIONS = [
  "dashboard.read",
  "players.read",
  "economy.read",
  "economy.adjust",
  "orders.read",
  "orders.manage",
  "reviews.read",
  "reviews.delete",
  "reviews.block",
  "permissions.manage",
  "audit.read",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const DEFAULT_MODERATOR_PERMISSIONS: AdminPermission[] = [
  "dashboard.read",
  "players.read",
  "economy.read",
  "orders.read",
  "orders.manage",
  "reviews.read",
];

export type AdminIdentity = {
  userId: string;
  discordId: string;
  discordRoleIds: string[];
  isAdmin: boolean;
  isModerator: boolean;
};

type IdentityResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; response: Response };

export async function resolveAdminIdentity(
  userId: string,
): Promise<IdentityResult> {
  const [discordAccount] = await db
    .select({ discordId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "discord")))
    .limit(1);

  if (discordAccount?.discordId === "539016515706683393") {
    return {
      ok: true,
      identity: {
        userId,
        discordId: discordAccount.discordId,
        discordRoleIds: [],
        isAdmin: true,
        isModerator: false,
      },
    };
  }

  const env = getEnv();
  if (
    !env.DISCORD_BOT_TOKEN ||
    !env.DISCORD_GUILD_ID ||
    !env.DISCORD_ROLE_ADMIN_ID ||
    !env.DISCORD_ROLE_MODERATOR_ID
  ) {
    return {
      ok: false,
      response: errorResponse(
        503,
        "admin_not_configured",
        "Для админки настрой DISCORD_BOT_TOKEN, DISCORD_GUILD_ID и ID ролей администратора/модератора",
      ),
    };
  }

  const [playerRow] = await db
    .select({ discordId: player.discordId })
    .from(player)
    .where(eq(player.userId, userId))
    .limit(1);
  if (!playerRow?.discordId) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "discord_not_linked",
        "У аккаунта не найден Discord ID",
      ),
    };
  }

  const member = await fetchGuildMember(playerRow.discordId);
  if (member.state === "error") {
    return {
      ok: false,
      response: errorResponse(
        503,
        "discord_unavailable",
        "Не удалось проверить роли Discord. Попробуй позже",
      ),
    };
  }
  if (member.state !== "member") {
    return {
      ok: false,
      response: errorResponse(
        403,
        "not_guild_member",
        "Для доступа нужно состоять на Discord-сервере Tuesday",
      ),
    };
  }

  const isAdmin =
    playerRow.discordId === "539016515706683393" ||
    member.roleIds.includes(env.DISCORD_ROLE_ADMIN_ID);
  const isModerator = member.roleIds.includes(env.DISCORD_ROLE_MODERATOR_ID);
  if (!isAdmin && !isModerator) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "forbidden",
        "Админка доступна только администраторам и модераторам Discord",
      ),
    };
  }

  const builtins = [
    { discordRoleId: env.DISCORD_ROLE_ADMIN_ID, label: "Администратор" },
    { discordRoleId: env.DISCORD_ROLE_MODERATOR_ID, label: "Модератор" },
  ];
  for (const role of builtins) {
    await db
      .insert(adminRole)
      .values(role)
      .onDuplicateKeyUpdate({
        set: { discordRoleId: sql`${adminRole.discordRoleId}` },
      });
  }

  return {
    ok: true,
    identity: {
      userId,
      discordId: playerRow.discordId,
      discordRoleIds: member.roleIds,
      isAdmin,
      isModerator,
    },
  };
}

export async function getPermissionsForIdentity(
  identity: AdminIdentity,
): Promise<Set<AdminPermission>> {
  if (identity.isAdmin) return new Set(ADMIN_PERMISSIONS);
  if (identity.discordRoleIds.length === 0) return new Set();

  const rows = await db
    .select({
      roleId: adminRole.id,
      discordRoleId: adminRole.discordRoleId,
      permission: adminRolePermission.permission,
      allowed: adminRolePermission.allowed,
    })
    .from(adminRolePermission)
    .innerJoin(adminRole, eq(adminRole.id, adminRolePermission.roleId))
    .where(
      and(
        inArray(adminRole.discordRoleId, identity.discordRoleIds),
        eq(adminRolePermission.allowed, true),
      ),
    );

  const result = new Set<AdminPermission>();
  for (const row of rows) {
    if ((ADMIN_PERMISSIONS as readonly string[]).includes(row.permission))
      result.add(row.permission as AdminPermission);
  }

  if (identity.isModerator) {
    const [modRole] = await db
      .select({ id: adminRole.id })
      .from(adminRole)
      .where(eq(adminRole.discordRoleId, getEnv().DISCORD_ROLE_MODERATOR_ID!))
      .limit(1);
    if (modRole) {
      const [configured] = await db
        .select({ total: count() })
        .from(adminRolePermission)
        .where(eq(adminRolePermission.roleId, modRole.id));
      if (!configured || configured.total === 0) {
        for (const permission of DEFAULT_MODERATOR_PERMISSIONS)
          result.add(permission);
      }
    }
  }
  return result;
}

export async function authorizeAdminRequest(
  req: Request,
  permission: AdminPermission,
  options: { rootOnly?: boolean; mutation?: boolean } = {},
): Promise<
  | { ok: true; identity: AdminIdentity; permissions: Set<AdminPermission> }
  | { ok: false; response: Response }
> {
  if (options.mutation) {
    const { checkSameOrigin } = await import("@/lib/utils/http");
    const csrf = checkSameOrigin(req);
    if (csrf) return { ok: false, response: csrf };
  }

  const session = await getSessionFromRequest(req);
  if (!session)
    return {
      ok: false,
      response: errorResponse(401, "unauthorized", "Войди через Discord"),
    };
  const resolved = await resolveAdminIdentity(session.user.id);
  if (!resolved.ok) return resolved;
  const permissions = await getPermissionsForIdentity(resolved.identity);
  if (options.rootOnly && !resolved.identity.isAdmin) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "forbidden",
        "Это действие доступно только администратору",
      ),
    };
  }
  if (!permissions.has(permission)) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "missing_permission",
        "Недостаточно прав для этого действия",
      ),
    };
  }
  return { ok: true, identity: resolved.identity, permissions };
}
