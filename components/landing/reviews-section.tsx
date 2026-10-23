import { connection } from "next/server";
import { Suspense } from "react";
import { Section, SectionHeading } from "../ui/section";
import { PlayerHead } from "../player/player-head";
import { getPublicReviews } from "@/lib/reviews/config";
import { ReviewStars } from "../review-form";
import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { cn } from "cn";

export type Review = {
  id: number;
  nick: string;
  text: string;
  rating: number;
};

export function ReviewsSection() {
  return (
    <Suspense fallback={null}>
      <ReviewsContent />
    </Suspense>
  );
}

async function ReviewsContent() {
  await connection();
  const reviews = await getPublicReviews(9);

  if (reviews.length === 0) return null;

  return (
    <Section id="reviews">
      <SectionHeading
        title="Что говорят игроки"
        description="Отзывы тех, кто уже играет на сервере."
      />

      <ul className="columns-1 gap-4 md:columns-2 lg:columns-3">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="mb-4 break-inside-avoid rounded-xl bg-card p-6 ring-1 ring-inset ring-foreground/10"
          >
            <ReviewsData review={review} />
          </li>
        ))}
      </ul>

      {reviews.length === 9 && (
        <div className="mt-8 flex justify-center">
          <Link
            href="/reviews"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Читать все отзывы
          </Link>
        </div>
      )}
    </Section>
  );
}

function ReviewsData({ review }: { review: Review }) {
  return (
    <>
      <blockquote className="wrap-anywhere text-pretty whitespace-pre-wrap leading-relaxed">
        {review.text}
      </blockquote>

      <div className="mt-5 flex items-center gap-3">
        <PlayerHead nickname={review.nick} className="size-10 rounded-md" />
        <p className="min-w-0 truncate text-sm font-medium">{review.nick}</p>
        <ReviewStars count={review.rating} />
      </div>
    </>
  );
}
