import { formatDate, formatNumber, pluralRu } from "@/lib/utils/formatting";
import type { Overview } from "./types";
import { Empty, Panel, Pill } from "./utils";
import { Button } from "../ui/button";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
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

type OverviewTabProps = {
  overview: Overview | null;
  onRefresh: () => void;
  refreshing: boolean;
};

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    "reviews.delete": "Удалил отзыв",
    "reviews.block": "Изменил блокировку отзывов",
    "permissions.update": "Изменил права доступа",
    "permissions.create": "Создал профиль прав",
    "balance.adjust": "Изменил баланс игрока",
    "economy.config.update": "Изменил цены магазина и награды",
  };

  return labels[action] ?? action;
}

export function OverviewTab({
  overview,
  onRefresh,
  refreshing,
}: OverviewTabProps) {
  const stats = [
    { label: "Аккаунты", value: overview?.users },
    { label: "Игроки", value: overview?.registeredPlayers },
    { label: "Заказы магазина", value: overview?.purchases },
    {
      label: "Суммарный баланс операций",
      value: overview?.netLedger,
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) => (
          <Panel key={card.label}>
            <p className="text-sm text-muted-foreground">{card.label}</p>

            <p className="title mt-3 text-3xl tabular-nums">
              {card.value == null ? "—" : formatNumber(card.value)}
            </p>
          </Panel>
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Последние действия</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Изменения баланса, отзывы и права доступа.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Pill>
              {overview?.latestAudit.length ?? 0}{" "}
              {pluralRu(
                overview?.latestAudit.length ?? 0,
                "запись",
                "записи",
                "записей",
              )}
            </Pill>

            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <ArrowClockwiseIcon
                className={refreshing ? "animate-spin" : ""}
                weight="bold"
              />
            </Button>
          </div>
        </div>

        {!overview?.latestAudit.length ? (
          <Empty>Пока нет действий.</Empty>
        ) : (
          <div className="overflow-x-auto mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Действие</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Администратор</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead className=" text-right">Подробности</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {overview.latestAudit.map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell>
                      <p className="font-medium">
                        {formatAuditAction(row.action)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        #{row.id}
                      </p>
                    </TableCell>

                    <TableCell className="flex flex-col gap-0.5">
                      <span className="text-sm">
                        {formatDate(row.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID события: {row.id}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {row.actorMcName ?? row.actorName ?? "Неизвестный"}
                          </p>
                          <p
                            className="max-w-35 truncate text-xs text-muted-foreground"
                            title={row.actorUserId}
                          >
                            {row.actorUserId}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {row.targetUserId ? (
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {row.targetMcName ??
                                row.targetName ??
                                "Неизвестный"}
                            </p>
                            <p
                              className="max-w-35 truncate text-xs text-muted-foreground"
                              title={row.targetUserId}
                            >
                              {row.targetUserId}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {row.meta != null ? (
                        <Dialog>
                          <DialogTrigger
                            render={
                              <Button variant="outline" size="sm">
                                Данные события
                              </Button>
                            }
                          />

                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Данные события</DialogTitle>
                            </DialogHeader>

                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word rounded-md bg-muted p-3">
                              {JSON.stringify(row.meta, null, 2)}
                            </pre>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Нет данных
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
