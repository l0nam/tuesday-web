import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAudit, adminRole, adminRolePermission } from "@/lib/db/schema";
import {
  ADMIN_PERMISSIONS,
  authorizeAdminRequest,
  DEFAULT_MODERATOR_PERMISSIONS,
} from "@/lib/admin/access";
import { getEnv } from "@/lib/env";
import { errorResponse, jsonResponse } from "@/lib/utils/http";

const permissionsSchema = z.object({
  discordRoleId: z.string().regex(/^\d{5,32}$/),
  label: z.string().trim().min(2).max(64),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length),
});
const addRoleSchema = z.object({
  discordRoleId: z.string().regex(/^\d{5,32}$/),
  label: z.string().trim().min(2).max(64),
});

async function roleRows() {
  const env = getEnv();
  const builtin = [
    ...(env.DISCORD_ROLE_ADMIN_ID
      ? [{ discordRoleId: env.DISCORD_ROLE_ADMIN_ID, label: "Администратор" }]
      : []),
    ...(env.DISCORD_ROLE_MODERATOR_ID
      ? [{ discordRoleId: env.DISCORD_ROLE_MODERATOR_ID, label: "Модератор" }]
      : []),
  ];
  for (const role of builtin) {
    await db
      .insert(adminRole)
      .values(role)
      .onDuplicateKeyUpdate({ set: { discordRoleId: role.discordRoleId } });
  }
  const roles = await db
    .select({
      id: adminRole.id,
      discordRoleId: adminRole.discordRoleId,
      label: adminRole.label,
      createdAt: adminRole.createdAt,
    })
    .from(adminRole)
    .orderBy(adminRole.id);
  const grants = await db
    .select({
      roleId: adminRolePermission.roleId,
      permission: adminRolePermission.permission,
      allowed: adminRolePermission.allowed,
    })
    .from(adminRolePermission);
  return roles.map((role) => {
    const configured = grants.filter((grant) => grant.roleId === role.id);
    const envAdmin = role.discordRoleId === env.DISCORD_ROLE_ADMIN_ID;
    const envMod = role.discordRoleId === env.DISCORD_ROLE_MODERATOR_ID;
    const enabled = configured.length
      ? configured.filter((g) => g.allowed).map((g) => g.permission)
      : envMod
        ? [...DEFAULT_MODERATOR_PERMISSIONS]
        : [];
    return {
      ...role,
      builtin: envAdmin || envMod,
      root: envAdmin,
      permissions: enabled,
    };
  });
}

export async function GET(req: Request) {
  const access = await authorizeAdminRequest(req, "permissions.manage", {
    rootOnly: true,
  });
  if (!access.ok) return access.response;
  return jsonResponse({
    roles: await roleRows(),
    allPermissions: ADMIN_PERMISSIONS,
  });
}

export async function POST(req: Request) {
  const access = await authorizeAdminRequest(req, "permissions.manage", {
    rootOnly: true,
    mutation: true,
  });
  if (!access.ok) return access.response;
  const parsed = addRoleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return errorResponse(
      400,
      "bad_request",
      "Укажи ID Discord-роли и название",
    );
  const env = getEnv();
  if (
    parsed.data.discordRoleId === env.DISCORD_ROLE_ADMIN_ID ||
    parsed.data.discordRoleId === env.DISCORD_ROLE_MODERATOR_ID
  ) {
    return errorResponse(
      409,
      "builtin_role",
      "Эта роль уже настроена как системная",
    );
  }
  await db
    .insert(adminRole)
    .values(parsed.data)
    .onDuplicateKeyUpdate({ set: { label: parsed.data.label } });
  await db.insert(adminAudit).values({
    actorUserId: access.identity.userId,
    action: "permissions.role_created",
    meta: {
      discordRoleId: parsed.data.discordRoleId,
      label: parsed.data.label,
    },
  });
  return jsonResponse({ ok: true, roles: await roleRows() }, 201);
}

export async function PUT(req: Request) {
  const access = await authorizeAdminRequest(req, "permissions.manage", {
    rootOnly: true,
    mutation: true,
  });
  if (!access.ok) return access.response;
  const parsed = permissionsSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return errorResponse(400, "bad_request", "Некорректный набор разрешений");
  const { discordRoleId, label, permissions } = parsed.data;
  const env = getEnv();
  if (discordRoleId === env.DISCORD_ROLE_ADMIN_ID)
    return errorResponse(
      400,
      "root_role",
      "Права системного администратора нельзя ограничить",
    );
  if (permissions.includes("permissions.manage"))
    return errorResponse(
      400,
      "root_permission",
      "Управлять разрешениями может только системный администратор",
    );
  const [role] = await db
    .select({ id: adminRole.id })
    .from(adminRole)
    .where(eq(adminRole.discordRoleId, discordRoleId))
    .limit(1);
  if (!role)
    return errorResponse(
      404,
      "not_found",
      "Роль не найдена. Сначала добавь её",
    );

  await db
    .update(adminRole)
    .set({ label })
    .where(eq(adminRole.discordRoleId, discordRoleId));
  await db
    .delete(adminRolePermission)
    .where(eq(adminRolePermission.roleId, role.id));
  await db.insert(adminRolePermission).values(
    ADMIN_PERMISSIONS.map((permission) => ({
      roleId: role.id,
      permission,
      allowed: permissions.includes(permission),
    })),
  );
  await db.insert(adminAudit).values({
    actorUserId: access.identity.userId,
    action: "permissions.updated",
    meta: { discordRoleId, label, permissions },
  });
  return jsonResponse({ ok: true, roles: await roleRows() });
}
