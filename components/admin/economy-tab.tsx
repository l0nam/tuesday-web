"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EditableRewardSettings } from "@/lib/economy/rewards/settings";
import { formatNumber } from "@/lib/utils/formatting";
import { Empty, Panel } from "./utils";

type ShopItem = {
  id: number;
  slug: string;
  name: string;
  price: number;
  enabled: boolean;
  fulfillmentMode: "auto" | "manual";
};

type EconomyResponse = {
  items: ShopItem[];
  rewards: EditableRewardSettings;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Не удалось сохранить настройки");
  }
  return data as T;
}

const rewardFields = "grid gap-4 sm:grid-cols-2";

function NumberField({
  id,
  label,
  value,
  min = 0,
  max = 1_000_000,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function EconomyTab() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({});
  const [rewards, setRewards] = useState<EditableRewardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<EconomyResponse>("/api/admin/economy");
      setItems(data.items);
      setPriceDraft(Object.fromEntries(data.items.map((item) => [item.id, String(item.price)])));
      setRewards(data.rewards);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateReward(
    section: "achievement" | "city" | "playtime" | "activity",
    key: string,
    value: number,
  ) {
    setRewards((current) => {
      if (!current) return current;
      switch (section) {
        case "achievement":
          return {
            ...current,
            achievement: { ...current.achievement, [key]: value },
          };
        case "city":
          return { ...current, city: { ...current.city, [key]: value } };
        case "playtime":
          return { ...current, playtime: { amountPerUnit: value } };
        case "activity":
          return { ...current, activity: { ...current.activity, [key]: value } };
      }
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rewards) return;

    const prices = items.map((item) => ({
      id: item.id,
      price: Number(priceDraft[item.id]),
    }));
    const invalidPrice = prices.find(
      (item) =>
        !Number.isSafeInteger(item.price) ||
        item.price < 1 ||
        item.price > 2_000_000_000,
    );
    if (invalidPrice) {
      setError("Цена каждого товара должна быть целым числом от 1 до 2 000 000 000.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const data = await request<EconomyResponse & { ok: true }>("/api/admin/economy", {
        method: "PATCH",
        body: JSON.stringify({ prices, rewards }),
      });
      setItems(data.items);
      setPriceDraft(
        Object.fromEntries(data.items.map((item) => [item.id, String(item.price)])),
      );
      setRewards(data.rewards);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Магазин и награды</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Меняй цены и баланс Вторничков за игровые действия. Изменения влияют на новые покупки и будущие начисления.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          Настройки сохранены.
        </div>
      )}

      {loading ? (
        <Panel>Загружаем товары и настройки наград…</Panel>
      ) : !rewards ? (
        <Panel><Empty>Не удалось загрузить настройки.</Empty></Panel>
      ) : (
        <form className="space-y-5" onSubmit={(event) => void save(event)}>
          <Panel className="p-0">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <h3 className="font-semibold">Цены товаров</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Уже оформленные заказы сохраняют цену на момент покупки.
              </p>
            </div>
            {items.length === 0 ? (
              <Empty>В магазине пока нет товаров.</Empty>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:px-5">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.slug} · {item.fulfillmentMode === "auto" ? "автовыдача" : "ручная выдача"}{!item.enabled ? " · отключён" : ""}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`price-${item.id}`}>Цена в Вторничках</Label>
                      <Input
                        id={`price-${item.id}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={2_000_000_000}
                        step={1}
                        required
                        value={priceDraft[item.id] ?? ""}
                        onChange={(event) =>
                          setPriceDraft((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Сейчас: {formatNumber(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <h3 className="font-semibold">Достижения</h3>
            <p className="mt-1 text-sm text-muted-foreground">Установи награду за каждый уровень достижения. Значение 0 отключает выплату.</p>
            <div className={`${rewardFields} mt-4`}>
              <NumberField id="reward-task" label="Задание" value={rewards.achievement.task} onChange={(value) => updateReward("achievement", "task", value)} />
              <NumberField id="reward-goal" label="Цель" value={rewards.achievement.goal} onChange={(value) => updateReward("achievement", "goal", value)} />
              <NumberField id="reward-challenge" label="Испытание" value={rewards.achievement.challenge} onChange={(value) => updateReward("achievement", "challenge", value)} />
            </div>
          </Panel>

          <Panel>
            <h3 className="font-semibold">Кланы</h3>
            <p className="mt-1 text-sm text-muted-foreground">Настрой размер разовой награды и минимальный размер клана для начисления.</p>
            <div className={`${rewardFields} mt-4`}>
              <NumberField id="reward-clan-members" label="Минимум участников" value={rewards.city.minMembers} min={1} max={100_000} onChange={(value) => updateReward("city", "minMembers", value)} />
              <NumberField id="reward-clan" label="Награда за клан" value={rewards.city.amount} onChange={(value) => updateReward("city", "amount", value)} />
            </div>
          </Panel>

          <Panel>
            <h3 className="font-semibold">Наигранное время</h3>
            <p className="mt-1 text-sm text-muted-foreground">Награда за каждый полный час нового игрового времени. Уже зачтённые часы повторно не оплачиваются.</p>
            <div className="mt-4 max-w-sm">
              <NumberField id="reward-playtime" label="Вторнички за час" value={rewards.playtime.amountPerUnit} onChange={(value) => updateReward("playtime", "amountPerUnit", value)} />
            </div>
          </Panel>

          <Panel>
            <h3 className="font-semibold">События и активности</h3>
            <p className="mt-1 text-sm text-muted-foreground">Награды за ивенты, конкурсы, квесты и голосования. Значение 0 отключает выплату.</p>
            <div className={`${rewardFields} mt-4`}>
              <NumberField id="reward-event" label="Ивент" value={rewards.activity.event} onChange={(value) => updateReward("activity", "event", value)} />
              <NumberField id="reward-contest" label="Конкурс" value={rewards.activity.contest} onChange={(value) => updateReward("activity", "contest", value)} />
              <NumberField id="reward-quest" label="Квест" value={rewards.activity.quest} onChange={(value) => updateReward("activity", "quest", value)} />
              <NumberField id="reward-vote" label="Голосование" value={rewards.activity.vote} onChange={(value) => updateReward("activity", "vote", value)} />
              <NumberField id="reward-custom-max" label="Максимум за custom-активность" value={rewards.customActivityMax} min={1} onChange={(value) => setRewards((current) => current ? { ...current, customActivityMax: value } : current)} />
            </div>
          </Panel>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || loading}>
              {saving ? "Сохраняем…" : "Сохранить цены и награды"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
