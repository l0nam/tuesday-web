import { eq, inArray } from "drizzle-orm";
import { db, withTransaction, type Tx } from "@/lib/db";
import {
  ledger,
  pendingReward,
  player,
  type LedgerType,
} from "@/lib/db/schema";

const MAX_BALANCE = 2_000_000_000;

export class InsufficientFundsError extends Error {
  constructor(
    public readonly balance: number,
    public readonly required: number,
  ) {
    super(`Недостаточно Вторничков: нужно ${required}, на балансе ${balance}`);
    this.name = "InsufficientFundsError";
  }
}

export interface MoneyOp {
  userId: string;
  amount: number;
  type: LedgerType;
  ref?: string;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}

function assertPositiveInt(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`Некорректная сумма: ${amount}`);
  }
}

export function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

export function insertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number(
    (header as { insertId?: number | string } | undefined)?.insertId ?? 0,
  );
}

async function lockPlayer(tx: Tx, userId: string) {
  const [row] = await tx
    .select({ balance: player.balance })
    .from(player)
    .where(eq(player.userId, userId))
    .for("update");
  if (!row) throw new Error(`Игрок ${userId} не найден`);
  return row;
}

export async function credit(
  tx: Tx,
  op: MoneyOp,
): Promise<{ applied: boolean; balance: number }> {
  assertPositiveInt(op.amount);
  const locked = await lockPlayer(tx, op.userId);

  const [existing] = await tx
    .select({ id: ledger.id })
    .from(ledger)
    .where(eq(ledger.idempotencyKey, op.idempotencyKey))
    .limit(1);
  if (existing) return { applied: false, balance: locked.balance };

  const balance = locked.balance + op.amount;
  if (balance > MAX_BALANCE) throw new Error("Превышен максимальный баланс");

  await tx.update(player).set({ balance }).where(eq(player.userId, op.userId));
  await tx.insert(ledger).values({
    userId: op.userId,
    amount: op.amount,
    balanceAfter: balance,
    type: op.type,
    ref: op.ref?.slice(0, 191) ?? null,
    idempotencyKey: op.idempotencyKey,
    meta: op.meta ?? null,
  });
  return { applied: true, balance };
}

export async function debit(tx: Tx, op: MoneyOp): Promise<{ balance: number }> {
  assertPositiveInt(op.amount);
  const locked = await lockPlayer(tx, op.userId);
  if (locked.balance < op.amount)
    throw new InsufficientFundsError(locked.balance, op.amount);

  const balance = locked.balance - op.amount;
  await tx.update(player).set({ balance }).where(eq(player.userId, op.userId));
  await tx.insert(ledger).values({
    userId: op.userId,
    amount: -op.amount,
    balanceAfter: balance,
    type: op.type,
    ref: op.ref?.slice(0, 191) ?? null,
    idempotencyKey: op.idempotencyKey,
    meta: op.meta ?? null,
  });
  return { balance };
}

export interface RewardGrant {
  mcUuid: string;
  amount: number;
  type: LedgerType;
  ref?: string;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
  /**
   * When true, never put a reward into pending_reward for an unlinked UUID.
   * Used by signed Minecraft-plugin events.
   */
  requireLinked?: boolean;
}

export type GrantResult =
  | { status: "credited"; amount: number; balance: number }
  | { status: "pending"; amount: number }
  | { status: "duplicate" }
  | { status: "unlinked" };

export async function grantRewardTx(
  tx: Tx,
  g: RewardGrant,
): Promise<GrantResult> {
  assertPositiveInt(g.amount);

  const [owner] = await tx
    .select({ userId: player.userId })
    .from(player)
    .where(eq(player.mcUuid, g.mcUuid))
    .limit(1);

  if (owner) {
    const r = await credit(tx, {
      userId: owner.userId,
      amount: g.amount,
      type: g.type,
      ref: g.ref,
      idempotencyKey: g.idempotencyKey,
      meta: g.meta,
    });
    return r.applied
      ? { status: "credited", amount: g.amount, balance: r.balance }
      : { status: "duplicate" };
  }

  if (g.requireLinked) return { status: "unlinked" };

  const inserted = await tx
    .insert(pendingReward)
    .ignore()
    .values({
      mcUuid: g.mcUuid,
      amount: g.amount,
      type: g.type,
      ref: g.ref?.slice(0, 191) ?? null,
      idempotencyKey: g.idempotencyKey,
      meta: g.meta ?? null,
    });
  return affectedRows(inserted) > 0
    ? { status: "pending", amount: g.amount }
    : { status: "duplicate" };
}

export async function claimIfLinked(mcUuid: string): Promise<void> {
  const [owner] = await db
    .select({ userId: player.userId })
    .from(player)
    .where(eq(player.mcUuid, mcUuid))
    .limit(1);
  if (owner) await claimPendingRewards(owner.userId, mcUuid);
}

export async function grantReward(g: RewardGrant): Promise<GrantResult> {
  const result = await withTransaction((tx) => grantRewardTx(tx, g));
  if (result.status === "pending") await claimIfLinked(g.mcUuid);
  return result;
}

export async function claimPendingRewards(
  userId: string,
  mcUuid: string,
): Promise<{ count: number; total: number }> {
  return withTransaction(async (tx) => {
    const rows = await tx
      .select()
      .from(pendingReward)
      .where(eq(pendingReward.mcUuid, mcUuid))
      .orderBy(pendingReward.id)
      .for("update");
    if (rows.length === 0) return { count: 0, total: 0 };

    let count = 0;
    let total = 0;
    for (const r of rows) {
      const res = await credit(tx, {
        userId,
        amount: r.amount,
        type: r.type,
        ref: r.ref ?? undefined,
        idempotencyKey: r.idempotencyKey,
        meta: {
          ...(r.meta ?? {}),
          deferred: true,
          earnedAt: r.createdAt.toISOString(),
        },
      });
      if (res.applied) {
        count += 1;
        total += r.amount;
      }
    }
    await tx.delete(pendingReward).where(
      inArray(
        pendingReward.id,
        rows.map((r) => r.id),
      ),
    );
    return { count, total };
  });
}
