import {
  bigint,
  boolean,
  char,
  date,
  datetime,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const ts = (name: string) => datetime(name, { mode: "date", fsp: 3 });
const createdAt = () =>
  ts("created_at")
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const onlineSample = mysqlTable("online_sample", {
  bucket: ts("bucket").primaryKey(),
  online: int("online", { unsigned: true }).notNull(),
});

export const appSetting = mysqlTable("app_setting", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
});

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    uniqueIndex("account_provider_account_uidx").on(t.providerId, t.accountId),
  ],
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------ */
/* Игрок                                                              */
/* ------------------------------------------------------------------ */

export const player = mysqlTable(
  "player",
  {
    userId: varchar("user_id", { length: 36 })
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    discordId: varchar("discord_id", { length: 32 }).notNull().unique(),
    mcUuid: char("mc_uuid", { length: 32 }).unique(),
    mcName: varchar("mc_name", { length: 32 }),
    balance: int("balance", { unsigned: true }).notNull().default(0),
    linkCheckedAt: ts("link_checked_at"),
    linkedAt: ts("linked_at"),

    bio: text("bio"),
    showDiscord: boolean("show_discord").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("player_mc_name_idx").on(t.mcName)],
);

/* ------------------------------------------------------------------ */
/* Журнал операций с Вторничками                                      */
/* ------------------------------------------------------------------ */

export const LEDGER_TYPES = [
  "achievement",
  "city",
  "playtime",
  "activity",
  "shop_purchase",
  "shop_refund",
  "admin",
] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const ledger = mysqlTable(
  "ledger",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: int("amount").notNull(),
    balanceAfter: int("balance_after", { unsigned: true }).notNull(),
    type: varchar("type", { length: 32 }).$type<LedgerType>().notNull(),
    ref: varchar("ref", { length: 191 }),
    idempotencyKey: varchar("idempotency_key", { length: 191 })
      .notNull()
      .unique(),
    meta: json("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_user_created_idx").on(t.userId, t.createdAt)],
);

export const pendingReward = mysqlTable(
  "pending_reward",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    mcUuid: char("mc_uuid", { length: 32 }).notNull(),
    amount: int("amount", { unsigned: true }).notNull(),
    type: varchar("type", { length: 32 }).$type<LedgerType>().notNull(),
    ref: varchar("ref", { length: 191 }),
    idempotencyKey: varchar("idempotency_key", { length: 191 })
      .notNull()
      .unique(),
    meta: json("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("pending_reward_uuid_idx").on(t.mcUuid)],
);

export const playtimeProgress = mysqlTable("playtime_progress", {
  mcUuid: char("mc_uuid", { length: 32 }).primaryKey(),
  creditedUnits: int("credited_units", { unsigned: true }).notNull().default(0),
  updatedAt: updatedAt(),
});

export const mcProfile = mysqlTable(
  "mc_profile",
  {
    mcUuid: char("mc_uuid", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 32 }).notNull(),
    skinUrl: varchar("skin_url", { length: 512 }),
    updatedAt: updatedAt(),
  },
  (t) => [index("mc_profile_name_idx").on(t.name)],
);

export const playerStats = mysqlTable("player_stats", {
  mcUuid: char("mc_uuid", { length: 32 }).primaryKey(),
  totalSeconds: bigint("total_seconds", { mode: "number", unsigned: true })
    .notNull()
    .default(0),
  online: boolean("online").notNull().default(false),
  firstSeenAt: ts("first_seen_at")
    .notNull()
    .$defaultFn(() => new Date()),
  lastSeenAt: ts("last_seen_at"),
  playtimeReportedAt: ts("playtime_reported_at"),
  updatedAt: updatedAt(),
});

export const playerDay = mysqlTable(
  "player_day",
  {
    mcUuid: char("mc_uuid", { length: 32 }).notNull(),
    day: date("day", { mode: "string" }).notNull(),
    seconds: int("seconds", { unsigned: true }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.mcUuid, t.day] })],
);

export const playerDiscord = mysqlTable("player_discord", {
  mcUuid: char("mc_uuid", { length: 32 }).primaryKey(),
  discordId: varchar("discord_id", { length: 32 }),
  username: varchar("username", { length: 64 }),
  roles: json("roles").$type<string[]>().notNull(),
  checkedAt: ts("checked_at"),
  updatedAt: updatedAt(),
});

export const playerDonate = mysqlTable(
  "player_donate",
  {
    mcUuid: char("mc_uuid", { length: 32 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    expiresAt: ts("expires_at"),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.mcUuid, t.tier] })],
);

export const playerCity = mysqlTable("player_city", {
  mcUuid: char("mc_uuid", { length: 32 }).primaryKey(),
  cityId: varchar("city_id", { length: 100 }).notNull(),
  cityName: varchar("city_name", { length: 120 }).notNull(),
  role: varchar("role", { length: 32 }),
  members: int("members", { unsigned: true }),
  updatedAt: updatedAt(),
});

export const CITY_ROLES = ["owner", "coowner", "member"] as const;
export type CityRole = (typeof CITY_ROLES)[number];

export const city = mysqlTable("city", {
  id: int("id", { unsigned: true }).primaryKey().autoincrement(),
  name: varchar("name", { length: 32 }).notNull(),
  nameKey: varchar("name_key", { length: 64 }).notNull().unique(),
  description: varchar("description", { length: 300 }),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  bannerCode: varchar("banner_code", { length: 255 }).notNull(),
  discordUrl: varchar("discord_url", { length: 255 }),
  recruiting: boolean("recruiting").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const cityMember = mysqlTable(
  "city_member",
  {
    userId: varchar("user_id", { length: 36 })
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    cityId: int("city_id", { unsigned: true })
      .notNull()
      .references(() => city.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 })
      .$type<CityRole>()
      .notNull()
      .default("member"),
    joinedAt: ts("joined_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("city_member_city_idx").on(t.cityId, t.role)],
);

export const APPLICATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const cityApplication = mysqlTable(
  "city_application",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    cityId: int("city_id", { unsigned: true })
      .notNull()
      .references(() => city.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: varchar("message", { length: 300 }),
    status: varchar("status", { length: 16 })
      .$type<ApplicationStatus>()
      .notNull()
      .default("pending"),
    rejectReason: varchar("reject_reason", { length: 300 }),
    reviewedBy: varchar("reviewed_by", { length: 36 }),
    reviewedAt: ts("reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("city_application_city_user_uidx").on(t.cityId, t.userId),
    index("city_application_user_idx").on(t.userId, t.status),
    index("city_application_city_status_idx").on(t.cityId, t.status),
  ],
);

export type City = typeof city.$inferSelect;
export type CityMemberRow = typeof cityMember.$inferSelect;
export type CityApplication = typeof cityApplication.$inferSelect;

/* ------------------------------------------------------------------ */
/* Магазин                                                              */
/* ------------------------------------------------------------------ */

export const shopItem = mysqlTable("shop_item", {
  id: int("id", { unsigned: true }).primaryKey().autoincrement(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 255 }),
  price: int("price", { unsigned: true }).notNull(),
  commands: json("commands").$type<string[]>().notNull(),
  fulfillmentMode: varchar("fulfillment_mode", { length: 16 })
    .$type<"auto" | "manual">()
    .notNull()
    .default("auto"),
  stock: int("stock", { unsigned: true }),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "delivered",
  "failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const shopOrder = mysqlTable(
  "shop_order",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: int("item_id", { unsigned: true })
      .notNull()
      .references(() => shopItem.id, { onDelete: "restrict" }),
    itemName: varchar("item_name", { length: 120 }).notNull(),
    mcUuid: char("mc_uuid", { length: 32 }).notNull(),
    mcName: varchar("mc_name", { length: 32 }),
    price: int("price", { unsigned: true }).notNull(),
    commands: json("commands").$type<string[]>().notNull(),
    status: varchar("status", { length: 16 })
      .$type<OrderStatus>()
      .notNull()
      .default("pending"),
    fulfillmentMode: varchar("fulfillment_mode", { length: 16 })
      .$type<"auto" | "manual">()
      .notNull()
      .default("auto"),
    failReason: varchar("fail_reason", { length: 255 }),
    createdAt: createdAt(),
    claimedAt: ts("claimed_at"),
    completedAt: ts("completed_at"),
  },
  (t) => [
    index("shop_order_status_idx").on(t.status, t.claimedAt),
    index("shop_order_user_idx").on(t.userId, t.createdAt),
  ],
);

export const serverReview = mysqlTable(
  "server_review",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .primaryKey()
      .autoincrement(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 500 }).notNull(),
    rating: int("rating", { unsigned: true }).notNull().default(5),
    createdAt: createdAt(),
  },
  (t) => [index("server_review_created_idx").on(t.createdAt)],
);

export const adminRole = mysqlTable(
  "admin_role",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    discordRoleId: varchar("discord_role_id", { length: 32 }).notNull(),
    label: varchar("label", { length: 64 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("admin_role_discord_uidx").on(t.discordRoleId)],
);

export const adminRolePermission = mysqlTable(
  "admin_role_permission",
  {
    roleId: int("role_id", { unsigned: true })
      .notNull()
      .references(() => adminRole.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 64 }).notNull(),
    allowed: boolean("allowed").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permission] }),
    index("admin_role_permission_key_idx").on(t.permission),
  ],
);

export const adminAudit = mysqlTable(
  "admin_audit",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    actorUserId: varchar("actor_user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetUserId: varchar("target_user_id", { length: 36 }).references(
      () => user.id,
      { onDelete: "set null" },
    ),
    action: varchar("action", { length: 80 }).notNull(),
    meta: json("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("admin_audit_created_idx").on(t.createdAt),
    index("admin_audit_target_idx").on(t.targetUserId),
  ],
);

export const adminReviewBlock = mysqlTable("admin_review_block", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  blockedBy: varchar("blocked_by", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 240 }),
  createdAt: createdAt(),
});

export type Player = typeof player.$inferSelect;
export type ShopItem = typeof shopItem.$inferSelect;
export type ShopOrder = typeof shopOrder.$inferSelect;
export type ServerReview = typeof serverReview.$inferSelect;
