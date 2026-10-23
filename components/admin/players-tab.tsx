"use client";

import type { FormEvent } from "react";
import { cn } from "cn";
import { CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  pluralRu,
} from "@/lib/utils/formatting";

import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Spinner } from "../ui/spinner";
import type { Detail, PlayerRow } from "./types";
import { Empty, Panel, Pill } from "./utils";

type PlayersTabProps = {
  players: PlayerRow[];
  selectedPlayer: Detail | null;
  search: string;
  loading: boolean;
  saving: boolean;
  balanceAmount: string;
  balanceReason: string;
  can: (permission: string) => boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onOpenPlayer: (userId: string) => void;
  onClosePlayer: () => void;
  onBalanceAmountChange: (value: string) => void;
  onBalanceReasonChange: (value: string) => void;
  onAdjustBalance: () => void;
};

const LEDGER_LABELS: Record<string, string> = {
  achievement: "Достижение",
  city: "Город",
  playtime: "Игровое время",
  activity: "Активность",
  shop_purchase: "Покупка в магазине",
  shop_refund: "Возврат покупки",
  admin: "Операция администратора",
};

function formatLedgerType(type: string) {
  return LEDGER_LABELS[type] ?? type.replaceAll("_", " ");
}

const ORDER_LABELS: Record<string, string> = {
  pending: "Ожидает выдачи",
  processing: "В обработке",
  delivered: "Выдан",
  failed: "Ошибка / возврат",
};

function formatLedgerRef(ref: string | null, type: string) {
  if (!ref) {
    switch (type) {
      case "achievement":
        return "Награда за достижение";
      case "city":
        return "Городская активность";
      case "playtime":
        return "Игровое время";
      case "activity":
        return "Игровая активность";
      case "shop_purchase":
        return "Покупка в магазине";
      case "shop_refund":
        return "Возврат средств";
      case "admin":
        return "Ручное изменение баланса";
      default:
        return "Источник не указан";
    }
  }

  return ref.replaceAll("_", " ");
}

export function PlayersTab({
  players,
  selectedPlayer,
  search,
  loading,
  saving,
  balanceAmount,
  balanceReason,
  can,
  onSearchChange,
  onSearchSubmit,
  onOpenPlayer,
  onClosePlayer,
  onBalanceAmountChange,
  onBalanceReasonChange,
  onAdjustBalance,
}: PlayersTabProps) {
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <div className="mt-6 space-y-5">
      <Panel>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={handleSearchSubmit}
        >
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Ник, имя или Discord ID"
            className="h-10"
          />

          <Button type="submit" disabled={loading}>
            Найти
          </Button>
        </form>
      </Panel>

      {selectedPlayer && (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {selectedPlayer.player.mcName ?? selectedPlayer.player.name}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Discord: {selectedPlayer.player.discordId} · UUID:{" "}
                {selectedPlayer.player.mcUuid ?? "не привязан"}
              </p>

              <p className="title mt-2 text-2xl">
                {formatNumber(selectedPlayer.player.balance)}{" "}
                {formatCurrency(selectedPlayer.player.balance)}
              </p>
            </div>

            <Button variant="outline" onClick={onClosePlayer}>
              Закрыть профиль
            </Button>
          </div>

          {can("economy.adjust") && (
            <div className="mt-5 rounded-xl border p-4">
              <h3 className="text-lg font-semibold">
                Ручная операция с балансом
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Положительное число начисляет, отрицательное списывает.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_auto]">
                <Input
                  step="1"
                  type="number"
                  inputMode="numeric"
                  value={balanceAmount}
                  onChange={(event) =>
                    onBalanceAmountChange(event.target.value)
                  }
                  aria-label="Сумма изменения"
                  className="h-10"
                />

                <Input
                  value={balanceReason}
                  onChange={(event) =>
                    onBalanceReasonChange(event.target.value)
                  }
                  placeholder="Причина операции"
                  className="h-10"
                />

                <Button onClick={onAdjustBalance} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner />
                      <span>Сохраняем…</span>
                    </>
                  ) : (
                    "Применить"
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">История Вторничков</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Все начисления и списания на балансе игрока
                </p>
              </div>

              <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                {selectedPlayer.transactions.length}{" "}
                {pluralRu(
                  selectedPlayer.transactions.length,
                  "операция",
                  "операции",
                  "операций",
                )}
              </span>
            </div>

            {selectedPlayer.transactions.length === 0 ? (
              <div className="mt-4">
                <Empty>История операций пуста.</Empty>
              </div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Операция</TableHead>
                      <TableHead>Причина</TableHead>
                      <TableHead>Изменение</TableHead>
                      <TableHead className="text-right">Баланс после</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {selectedPlayer.transactions.map((row) => {
                      const isPositive = row.amount > 0;
                      const isNeutral = row.amount === 0;

                      return (
                        <TableRow key={row.id} className="group">
                          <TableCell className="whitespace-nowrap">
                            {formatDate(row.createdAt)}
                          </TableCell>

                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium">
                                {formatLedgerType(row.type)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Операция #{row.id}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex max-w-70 items-center gap-2">
                              <span
                                className="truncate"
                                title={row.ref ?? undefined}
                              >
                                {formatLedgerRef(row.ref, row.type)}
                              </span>

                              {row.meta != null && (
                                <Dialog>
                                  <DialogTrigger
                                    render={
                                      <Button variant="outline" size="sm">
                                        Детали
                                      </Button>
                                    }
                                  />

                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {formatLedgerType(row.type)}
                                      </DialogTitle>
                                    </DialogHeader>

                                    <div className="space-y-3">
                                      <div className="rounded-md border bg-muted/30 p-3">
                                        <p className="text-xs text-muted-foreground">
                                          Причина операции
                                        </p>
                                        <p className="mt-1 wrap-break-word text-sm font-medium">
                                          {formatLedgerRef(row.ref, row.type)}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="mb-2 text-sm font-medium">
                                          Дополнительные данные
                                        </p>
                                        <pre className="max-h-[50vh] overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap wrap-break-word">
                                          {JSON.stringify(row.meta, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-semibold tabular-nums",
                                isPositive
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : isNeutral
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-destructive/10 text-destructive",
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {formatNumber(row.amount)}
                              <span className="ml-1 text-xs font-medium opacity-80">
                                {formatCurrency(row.amount, true)}
                              </span>
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div>
                              <p className="font-semibold tabular-nums">
                                {formatNumber(row.balanceAfter)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatCurrency(row.balanceAfter)}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {selectedPlayer.transactions.length === 0 && (
            <Empty>История операций пуста.</Empty>
          )}

          {selectedPlayer.orders.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold">Покупки игрока</h3>

              <div className="mt-2 space-y-2">
                {selectedPlayer.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        #{order.id} · {order.itemName}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span>{formatNumber(order.price)}</span>
                      <Pill
                        tone={
                          order.status === "delivered"
                            ? "good"
                            : order.status === "failed"
                              ? "bad"
                              : "warn"
                        }
                      >
                        {ORDER_LABELS[order.status] ?? order.status}
                      </Pill>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      )}

      {!selectedPlayer && (
        <Panel className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Игрок</TableHead>
                  <TableHead>Discord ID</TableHead>
                  <TableHead>Minecraft</TableHead>
                  <TableHead className="text-right">Баланс</TableHead>
                  <TableHead className="text-right">Профиль</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {players.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <p className="font-medium">{row.mcName ?? row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.name}
                      </p>
                    </TableCell>

                    <TableCell>{row.discordId}</TableCell>

                    <TableCell>
                      {row.mcUuid ? (
                        <CheckIcon
                          weight="bold"
                          className="size-4.5 text-primary"
                        />
                      ) : (
                        <XIcon
                          weight="bold"
                          className="size-4.5 text-destructive"
                        />
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {formatNumber(row.balance)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenPlayer(row.userId)}
                        disabled={loading}
                      >
                        Открыть
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {players.length === 0 && (
            <Empty>По этому запросу игроков не найдено.</Empty>
          )}
        </Panel>
      )}
    </div>
  );
}
