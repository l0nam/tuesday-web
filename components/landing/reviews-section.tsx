import { Section, SectionHeading } from "@/components/ui/section";
import { PlayerHead } from "@/components/player/player-head";

export type Review = {
  id: number;
  nick: string;
  text: string;
};

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
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
            <blockquote className="text-pretty whitespace-pre-wrap leading-relaxed">
              {review.text}
            </blockquote>

            <div className="mt-5 flex items-center gap-3">
              <PlayerHead
                nickname={review.nick}
                className="size-10 rounded-md"
              />
              <p className="min-w-0 truncate text-sm font-medium">
                {review.nick}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
