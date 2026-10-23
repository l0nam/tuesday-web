export type PlayerRow = {
  userId: string;
  name: string;
  image: string | null;
  createdAt: string;
  discordId: string;
  mcName: string | null;
  mcUuid: string | null;
  balance: number;
  linkedAt: string | null;
};

export type LedgerRow = {
  id: number;
  amount: number;
  balanceAfter: number;
  type: string;
  ref: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type OrderRow = {
  id: number;
  userId: string;
  userName: string;
  mcName: string | null;
  discordId: string;
  itemName: string;
  price: number;
  status: string;
  failReason: string | null;
  createdAt: string;
  claimedAt: string | null;
  completedAt: string | null;
};

export type ReviewRow = {
  id: number;
  userId: string;
  text: string;
  createdAt: string;
  userName: string;
  mcName: string | null;
  discordId: string;
  blocked: boolean;
};

export type BlockedRow = {
  userId: string;
  userName: string;
  mcName: string | null;
  discordId: string;
  reason: string | null;
  createdAt: string;
};

export type PermissionRole = {
  id: number;
  discordRoleId: string;
  label: string;
  builtin: boolean;
  root: boolean;
  permissions: string[];
};

type AuditRow = {
  id: number;
  action: string;
  actorUserId: string;
  targetUserId: string | null;
  createdAt: string;
  meta: unknown;

  actorName: string | null;
  actorMcName: string | null;
  targetName: string | null;
  targetMcName: string | null;
};

export type Overview = {
  users: number;
  registeredPlayers: number;
  purchases: number;
  reviews: number | null;
  netLedger: number;
  latestAudit: AuditRow[];
  isAdmin: boolean;
  permissions: string[];
};

export type Detail = {
  player: PlayerRow;
  transactions: LedgerRow[];
  orders: Omit<OrderRow, "userName" | "discordId">[];
  permissions: string[];
};

export type PermissionItem = {
  key: string;
  label: string;
  description: string;
};
