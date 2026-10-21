"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote } from "@/components/cities/use-city-api";
import { SERVER_REVIEW_MAX_LENGTH, SERVER_REVIEW_MIN_LENGTH } from "@/lib/reviews";

type ExistingReview = { id: number; text: string; createdAt: string | Date } | null;

export function ReviewForm({ initialReview }: { initialReview: ExistingReview }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(Boolean(initialReview));
  const length = Array.from(text.trim()).length;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || length < SERVER_REVIEW_MIN_LENGTH || length > SERVER_REVIEW_MAX_LENGTH) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(data?.error?.message ?? "Не удалось опубликовать отзыв.");
        if (response.status === 409) setSubmitted(true);
        return;
      }
      setSubmitted(true);
      setText("");
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-8">
      <div className="mb-5 space-y-2">
        <h2 className="title text-2xl">Отзыв о сервере</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Расскажи, что тебе нравится на Tuesday и какие впечатления оставила игра.
          Отзыв можно опубликовать только один раз — после отправки изменить или удалить его нельзя.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-3 rounded-xl bg-muted/50 p-4">
          <p className="font-medium">Спасибо за отзыв!</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{initialReview?.text ?? "Отзыв отправлен и появится в секции отзывов на главной странице."}</p>
          <p className="text-xs text-muted-foreground">Публикация окончательная: редактирование и удаление недоступны.</p>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Поделись впечатлениями о сервере…"
            maxLength={SERVER_REVIEW_MAX_LENGTH}
            rows={5}
            aria-label="Текст отзыва о сервере"
            disabled={busy}
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {length} / {SERVER_REVIEW_MAX_LENGTH}
              {length > 0 && length < SERVER_REVIEW_MIN_LENGTH ? ` · минимум ${SERVER_REVIEW_MIN_LENGTH}` : ""}
            </p>
            <Button type="submit" disabled={busy || length < SERVER_REVIEW_MIN_LENGTH || length > SERVER_REVIEW_MAX_LENGTH}>
              {busy ? "Публикуем…" : "Опубликовать отзыв"}
            </Button>
          </div>
          <ErrorNote message={error} />
        </form>
      )}
    </section>
  );
}
