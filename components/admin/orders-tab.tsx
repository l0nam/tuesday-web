"use client";

import { useState } from "react";
import { formatDate, formatNumber } from "@/lib/utils/formatting";
import type { OrderRow } from "./types";
import { Empty, Panel, Pill } from "./utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ORDER_LABELS: Record<string, string> = {
  pending: "Ожидает выдачи",
  processing: "В обработке",
  delivered: "Выдан",
  failed: "Ошибка / возврат",
};

const EDITABLE_STATUSES = [
  "pending",
  "processing",
  "delivered",
  "failed",
] as const;

type EditableStatus = (typeof EDITABLE_STATUSES)[number];

type OrdersTabProps = {
  orders: OrderRow[];
  onStatusChange: (
    order: OrderRow,
    status: EditableStatus,
  ) => Promise<void> | void;
};

export function OrdersTab({ orders, onStatusChange }: OrdersTabProps) {
  const [savingId, setSavingId] = useState<number | string | null>(null);

  async function changeStatus(order: OrderRow, value: string) {
    if (!EDITABLE_STATUSES.includes(value as EditableStatus)) return;
    if (value === order.status) return;

    setSavingId(order.id);

    try {
      await onStatusChange(order, value as EditableStatus);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Panel className="mt-6 p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Заказ</TableHead>
              <TableHead>Игрок</TableHead>
              <TableHead>Товар</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Ошибка</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orders.map((row) => {
              const terminal =
                row.status === "delivered" || row.status === "failed";

              return (
                <TableRow key={row.id}>
                  <TableCell>#{row.id}</TableCell>

                  <TableCell>
                    <p className="font-medium">{row.mcName ?? row.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.discordId}
                    </p>
                  </TableCell>

                  <TableCell>{row.itemName}</TableCell>

                  <TableCell className="whitespace-nowrap">
                    {formatNumber(row.price)}
                  </TableCell>

                  <TableCell className="min-w-48">
                    <div className="space-y-px">
                      {terminal && (
                        <Pill
                          tone={
                            row.status === "delivered"
                              ? "good"
                              : row.status === "failed"
                                ? "bad"
                                : "warn"
                          }
                        >
                          {ORDER_LABELS[row.status] ?? row.status}
                        </Pill>
                      )}

                      {!terminal && (() => {
                        const statusOptions = [
                          ...new Set([...EDITABLE_STATUSES, row.status]),
                        ];

                        return (
                          <Select
                            value={row.status}
                            disabled={savingId === row.id || terminal}
                            onValueChange={(status) => {
                              if (status == null) return;
                              void changeStatus(row, status);
                            }}
                          >
                            <SelectTrigger
                              aria-label={`Статус заказа ${row.id}`}
                              className="w-full max-w-48"
                            >
                              <SelectValue>
                                {ORDER_LABELS[row.status] ?? row.status}
                              </SelectValue>
                            </SelectTrigger>

                            <SelectContent alignItemWithTrigger>
                              <SelectGroup>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {ORDER_LABELS[status] ?? status}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        );
                      })()}

                      {savingId === row.id && (
                        <p className="text-xs text-muted-foreground">
                          Сохраняем…
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-64 wrap-break-word">
                    {row.failReason ?? "—"}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {orders.length === 0 && <Empty>Покупок пока нет.</Empty>}
    </Panel>
  );
}
