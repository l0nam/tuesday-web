"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { Spinner } from "../ui/spinner";
import { formatNumber } from "@/lib/utils/formatting";
import {
  BlockedRow,
  Detail,
  OrderRow,
  Overview,
  PermissionRole,
  PlayerRow,
  ReviewRow,
} from "./types";
import { Pill } from "./utils";
import { OverviewTab } from "./overview-tab";
import { PlayersTab } from "./players-tab";
import { OrdersTab } from "./orders-tab";
import { ReviewsTab } from "./reviews-tab";
import { PermissionsTab } from "./permissions";
import { EconomyTab } from "./economy-tab";

type Tab = "overview" | "players" | "orders" | "reviews" | "economy" | "permissions";

const NAV: { id: Tab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "players", label: "Игроки" },
  { id: "orders", label: "Покупки" },
  { id: "reviews", label: "Отзывы" },
  { id: "economy", label: "Магазин и награды" },
  { id: "permissions", label: "Права доступа" },
];

const PERMISSION_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  "dashboard.read": { label: "Обзор", description: "Общая статистика и аудит" },
  "players.read": {
    label: "Просмотр игроков",
    description: "Профили, Discord ID, баланс и история операций",
  },
  "economy.read": {
    label: "История экономики",
    description: "Просмотр начислений и списаний",
  },
  "economy.adjust": {
    label: "Изменение баланса",
    description: "Ручное начисление/списание с обязательной причиной",
  },
  "orders.read": {
    label: "Покупки магазина",
    description: "Просмотр заказов и их статусов",
  },
  "orders.manage": {
    label: "Статус покупок",
    description: "Управление статусом заказов",
  },
  "reviews.read": {
    label: "Просмотр отзывов",
    description: "Читать отзывы игроков",
  },
  "reviews.delete": {
    label: "Удаление отзывов",
    description: "Удалять отдельные отзывы",
  },
  "reviews.block": {
    label: "Блокировка отзывов",
    description: "Запрещать пользователю отправлять новые отзывы",
  },
  "permissions.manage": {
    label: "Настройка прав",
    description: "Управлять ролями и разрешениями (только администратор)",
  },
  "audit.read": {
    label: "Журнал действий",
    description: "Просмотр административных действий",
  },
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(data?.error?.message ?? "Не удалось выполнить запрос");
  return data as T;
}

export function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [blockedRows, setBlockedRows] = useState<BlockedRow[]>([]);
  const [roles, setRoles] = useState<PermissionRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Detail | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("10");
  const [balanceReason, setBalanceReason] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});
  const [refreshingOverview, setRefreshingOverview] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);

  const selectedRole =
    roles.find((role) => role.discordRoleId === selectedRoleId) ?? null;
  const can = useCallback(
    (permission: string) => Boolean(overview?.permissions.includes(permission)),
    [overview],
  );

  async function refreshOverview() {
    setRefreshingOverview(true);

    try {
      const data = await request<Overview>("/api/admin/overview");
      setOverview(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось обновить обзор",
      );
    } finally {
      setRefreshingOverview(false);
    }
  }

  async function refreshOrders() {
    setRefreshingOrders(true);
    setError(null);

    try {
      const result = await request<{ orders: OrderRow[] }>("/api/admin/orders");
      setOrders(result.orders);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось обновить заказы",
      );
    } finally {
      setRefreshingOrders(false);
    }
  }

  const load = useCallback(async (nextTab: Tab, query = "") => {
    setLoading(true);
    setError(null);
    try {
      if (nextTab === "overview")
        setOverview(await request<Overview>("/api/admin/overview"));

      if (nextTab === "players")
        setPlayers(
          (
            await request<{ players: PlayerRow[] }>(
              `/api/admin/players?q=${encodeURIComponent(query)}`,
            )
          ).players,
        );

      if (nextTab === "orders")
        setOrders(
          (await request<{ orders: OrderRow[] }>("/api/admin/orders")).orders,
        );

      if (nextTab === "reviews") {
        const result = await request<{
          reviews: ReviewRow[];
          blockedUsers: BlockedRow[];
        }>("/api/admin/reviews");
        setReviews(result.reviews);
        setBlockedRows(result.blockedUsers ?? []);
        setBlockedUsers(
          Object.fromEntries(
            (result.blockedUsers ?? []).map((r) => [r.userId, true]),
          ),
        );
      }

      if (nextTab === "permissions") {
        const result = await request<{
          roles: PermissionRole[];
          allPermissions: string[];
        }>("/api/admin/permissions");
        setRoles(result.roles);
        setAllPermissions(result.allPermissions);
        setSelectedRoleId((current) =>
          current && result.roles.some((r) => r.discordRoleId === current)
            ? current
            : (result.roles.find((r) => !r.root)?.discordRoleId ??
              result.roles[0]?.discordRoleId ??
              ""),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("overview");
  }, [load]);

  useEffect(() => {
    if (tab === "players") void load("players", search);
    else if (tab === "orders") void load("orders");
    else if (tab === "reviews") void load("reviews");
    else if (tab === "permissions") void load("permissions");
  }, [tab, search, load]);

  useEffect(() => {
    setDraftPermissions(selectedRole?.permissions ?? []);
  }, [selectedRoleId, roles]);

  async function openPlayer(userId: string) {
    setError(null);
    setLoading(true);
    try {
      setSelectedPlayer(
        await request<Detail>(
          `/api/admin/players/${encodeURIComponent(userId)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось открыть профиль");
    } finally {
      setLoading(false);
    }
  }

  async function adjustBalance() {
    if (!selectedPlayer) return;
    const amount = Number(balanceAmount);
    if (
      !Number.isSafeInteger(amount) ||
      amount === 0 ||
      !balanceReason.trim()
    ) {
      setError("Укажи ненулевую целую сумму и причину.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await request(
        `/api/admin/players/${encodeURIComponent(selectedPlayer.player.userId)}`,
        {
          method: "POST",
          body: JSON.stringify({ amount, reason: balanceReason.trim() }),
        },
      );
      setBalanceReason("");
      setSelectedPlayer(null);
      await load("players", search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить баланс");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview(review: ReviewRow) {
    if (
      !window.confirm(
        `Удалить отзыв пользователя ${review.mcName ?? review.userName}?`,
      )
    )
      return;
    setError(null);
    try {
      await request(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      setReviews((items) => items.filter((item) => item.id !== review.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить отзыв");
    }
  }

  async function changeOrderStatus(
    order: OrderRow,
    status: OrderRow["status"],
  ) {
    if (order.status === status) return;

    if (
      status === "failed" &&
      !window.confirm(
        `Пометить заказ #${order.id} как ошибочный и вернуть игроку ${formatNumber(order.price)} Вторничков?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      await request(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      await load("orders");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось изменить статус заказа",
      );
    }
  }

  async function blockReview(review: ReviewRow, blocked: boolean) {
    const prompted = blocked
      ? window.prompt("Причина блокировки (необязательно):", "")
      : "";
    if (prompted === null) return;
    const reason = prompted ?? "";
    setError(null);
    try {
      await request("/api/admin/reviews/block", {
        method: "POST",
        body: JSON.stringify({ userId: review.userId, blocked, reason }),
      });
      await load("reviews");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось изменить блокировку",
      );
    }
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    try {
      const result = await request<{ roles: PermissionRole[] }>(
        "/api/admin/permissions",
        {
          method: "PUT",
          body: JSON.stringify({
            discordRoleId: selectedRole.discordRoleId,
            label: selectedRole.label,
            permissions: draftPermissions,
          }),
        },
      );
      setRoles(result.roles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить права");
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    setSaving(true);
    setError(null);
    try {
      const result = await request<{ roles: PermissionRole[] }>(
        "/api/admin/permissions",
        {
          method: "POST",
          body: JSON.stringify({
            discordRoleId: newRoleId.trim(),
            label: newRoleLabel.trim(),
          }),
        },
      );
      setRoles(result.roles);
      setSelectedRoleId(newRoleId.trim());
      setNewRoleId("");
      setNewRoleLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить роль");
    } finally {
      setSaving(false);
    }
  }

  const tabs = NAV.filter(
    (item) =>
      (item.id !== "permissions" || isAdmin) &&
      (item.id !== "economy" || isAdmin),
  );
  const permissionKeys = useMemo(
    () =>
      allPermissions.length ? allPermissions : Object.keys(PERMISSION_LABELS),
    [allPermissions],
  );

  return (
    <main className="mx-auto min-h-svh w-full max-w-6xl px-4 pb-16 pt-26 sm:px-6 lg:px-10">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <h1 className="title mt-2 text-3xl sm:text-4xl">Админ-панель</h1>

        <Pill tone={isAdmin ? "good" : "warn"}>
          {isAdmin ? "Администратор" : "Модератор"}
        </Pill>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-5 inline-flex w-full items-center justify-between gap-4 rounded-md border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <p>{error}</p>

          <Button
            onClick={() => setError(null)}
            aria-label="Закрыть сообщение"
            variant="outline"
            size="icon-sm"
          >
            <XIcon weight="bold" />
          </Button>
        </div>
      )}

      <nav className="mt-8" aria-label="Разделы админки">
        <Tabs>
          <div className="w-full min-w-0 overflow-x-auto">
            <TabsList className="inline-flex h-auto w-max min-w-full sm:w-full justify-start">
              {tabs.map((item) => (
                <TabsTrigger
                  onClick={() => setTab(item.id)}
                  key={item.id}
                  value={item.id}
                  className="shrink-0"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab
              overview={overview}
              onRefresh={() => void refreshOverview()}
              refreshing={refreshingOverview}
            />
          </TabsContent>

          <TabsContent value="players">
            <PlayersTab
              players={players}
              selectedPlayer={selectedPlayer}
              search={search}
              loading={loading}
              saving={saving}
              balanceAmount={balanceAmount}
              balanceReason={balanceReason}
              can={can}
              onSearchChange={setSearch}
              onSearchSubmit={() => void load("players", search)}
              onOpenPlayer={(userId) => void openPlayer(userId)}
              onClosePlayer={() => setSelectedPlayer(null)}
              onBalanceAmountChange={setBalanceAmount}
              onBalanceReasonChange={setBalanceReason}
              onAdjustBalance={() => void adjustBalance()}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab
              orders={orders}
              refreshing={refreshingOrders}
              onRefresh={refreshOrders}
              onStatusChange={changeOrderStatus}
            />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsTab
              reviews={reviews}
              blockedRows={blockedRows}
              blockedUsers={blockedUsers}
              can={can}
              onBlockReview={(row, blocked) => void blockReview(row, blocked)}
              onDeleteReview={(row) => void deleteReview(row)}
              onUnblockUser={(userId) => {
                void request("/api/admin/reviews/block", {
                  method: "POST",
                  body: JSON.stringify({ userId, blocked: false }),
                })
                  .then(() => load("reviews"))
                  .catch((e) =>
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Не удалось снять блокировку",
                    ),
                  );
              }}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="economy">
              <EconomyTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="permissions">
              <PermissionsTab
                roles={roles}
                selectedRole={selectedRole}
                selectedRoleId={selectedRoleId}
                newRoleLabel={newRoleLabel}
                newRoleId={newRoleId}
                permissionKeys={permissionKeys}
                draftPermissions={draftPermissions}
                saving={saving}
                canManage={isAdmin}
                permissionLabels={PERMISSION_LABELS}
                onSelectRole={setSelectedRoleId}
                onNewRoleLabelChange={setNewRoleLabel}
                onNewRoleIdChange={setNewRoleId}
                onCreateRole={() => void createRole()}
                onDraftPermissionsChange={setDraftPermissions}
                onSavePermissions={() => void savePermissions()}
              />
            </TabsContent>
          )}
        </Tabs>
      </nav>

      {loading && (
        <p className="inline-flex items-center gap-2.5 mt-4 text-sm text-muted-foreground">
          <Spinner /> Обновляем данные…
        </p>
      )}
    </main>
  );
}
