import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Section, SectionHeading } from "@/components/ui/section";
import { PlayerHead } from "@/components/player/player-head";
import { ReviewStars } from "@/components/review-form";
import { getPublicReviews } from "@/lib/reviews/config";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";

export default function ReviewsPage() {
  return (
    <Suspense fallback={<ReviewsFallback />}>
      <ReviewsContent />
    </Suspense>
  );
}

function ReviewsFallback() {
  return (
    <Section>
      <p className="text-muted-foreground">Загружаем отзывы...</p>
    </Section>
  );
}

async function ReviewsContent() {
  await connection();
  const reviews = await getPublicReviews();

  return (
    <Section>
      <Link
        href="/#reviews"
        className="mb-6 inline-flex gap-2.5 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretLeftIcon weight="bold" className="mt-0.5" /> На главную
      </Link>

      <SectionHeading
        title="Отзывы игроков"
        description="Все отзывы сообщества о нашем сервере."
      />

      {reviews.length === 0 ? (
        <p className="text-muted-foreground">Пока отзывов нет. Будь первым!</p>
      ) : (
        <ul className="columns-1 gap-4 md:columns-2 lg:columns-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="mb-4 break-inside-avoid rounded-xl bg-card p-6 ring-1 ring-inset ring-foreground/10"
            >
              <blockquote className="wrap-anywhere whitespace-pre-wrap text-pretty leading-relaxed">
                {review.text}
              </blockquote>

              <div className="mt-5 flex min-w-0 items-center gap-3">
                <PlayerHead
                  nickname={review.nick}
                  className="size-10 shrink-0 rounded-md"
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {review.nick}
                </p>
                <ReviewStars count={review.rating} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
