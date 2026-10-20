"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Запросы к /api/cities из клиентских компонентов: состояние загрузки, текст ошибки, обновление страницы. */
export function useCityApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T | null> {
    if (busy) return null;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
      if (!res.ok) {
        setError(data?.error?.message ?? "Не удалось выполнить действие");
        return null;
      }
      return (data ?? {}) as T;
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, call, refresh: () => router.refresh(), router };
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
