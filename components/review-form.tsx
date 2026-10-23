"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote } from "@/components/cities/use-city-api";
import {
  SERVER_REVIEW_MAX_LENGTH,
  SERVER_REVIEW_MIN_LENGTH,
} from "@/lib/reviews/constants";
import { StarIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

type ExistingReview = {
  id: number;
  text: string;
  rating: number;
  createdAt: string | Date;
} | null;

export function ReviewStars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1 text-lg">
      {Array.from({ length: 5 }, (_, index) => {
        const marked = index < count;
        return (
          <StarIcon
            key={index}
            className={marked ? "text-amber-400" : "text-muted-foreground/30"}
            weight={marked ? "fill" : "duotone"}
          />
        );
      })}
    </div>
  );
}

export function ReviewForm({
  initialReview,
}: {
  initialReview: ExistingReview;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(Boolean(initialReview));
  const length = Array.from(text.trim()).length;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      busy ||
      length < SERVER_REVIEW_MIN_LENGTH ||
      length > SERVER_REVIEW_MAX_LENGTH
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), rating }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

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

  if (submitted)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Спасибо за отзыв!</CardTitle>
        </CardHeader>
        <CardContent className="wrap-anywhere">
          <ReviewStars count={initialReview?.rating ?? rating} />

          {initialReview?.text ??
            "Отзыв отправлен и появится в секции отзывов на главной странице."}
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Отзыв о сервере</CardTitle>
        <CardDescription>
          Расскажи, что тебе нравится на Tuesday и какие впечатления оставила
          игра. Отзыв можно опубликовать только один раз — после отправки
          изменить или удалить его нельзя.
        </CardDescription>
      </CardHeader>

      <CardFooter>
        <Dialog>
          <DialogTrigger render={<Button>Оставить отзыв</Button>} />

          <DialogContent>
            <form
              onSubmit={(event) => void submit(event)}
              className="space-y-5"
            >
              <fieldset className="space-y-2" disabled={busy}>
                <legend className="text-sm font-medium">Оценка сервера</legend>

                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const selected = value <= rating;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`${value} из 5 звёзд`}
                        aria-pressed={rating === value}
                        className="text-3xl leading-none transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <StarIcon
                          weight={selected ? "fill" : "duotone"}
                          className={
                            selected
                              ? "text-amber-400"
                              : "text-muted-foreground/30"
                          }
                        />
                      </button>
                    );
                  })}

                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating} из 5
                  </span>
                </div>
              </fieldset>

              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Поделись впечатлениями о сервере…"
                maxLength={SERVER_REVIEW_MAX_LENGTH}
                rows={5}
                aria-label="Текст отзыва о сервере"
                disabled={busy}
                required
                className="max-h-50"
              />

              <div className="inline-flex gap-2 w-full p-3 border rounded-md bg-amber-500/10 border-amber-500/30 text-amber-400">
                <WarningIcon weight="bold" className="size-5" />
                <p>Отзыв нельзя поменять или удалить</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {length} / {SERVER_REVIEW_MAX_LENGTH}
                  {length > 0 && length < SERVER_REVIEW_MIN_LENGTH
                    ? ` · минимум ${SERVER_REVIEW_MIN_LENGTH}`
                    : ""}
                </p>

                <Button
                  type="submit"
                  disabled={
                    busy ||
                    length < SERVER_REVIEW_MIN_LENGTH ||
                    length > SERVER_REVIEW_MAX_LENGTH
                  }
                >
                  {busy ? "Публикуем…" : "Опубликовать отзыв"}
                </Button>
              </div>

              <ErrorNote message={error} />
            </form>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
