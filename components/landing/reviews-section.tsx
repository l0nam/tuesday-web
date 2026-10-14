import { cn } from "cn";
import { Section, SectionHeading } from "../ui/section";
import { PlayerHead } from "../player-head";

export type Review = {
  nick: string;
  text: string;
  source?: string;
};

export const REVIEWS: Review[] = [
  {
    nick: "L0nam",
    text: "Здесь будет отзыв. Вставь из Discord и укажите ник типа.",
  },
  {
    nick: "ykollix",
    text: "Короткий отзыв.",
  },
  {
    nick: "Vo1tr0n",
    text: "Отзыв подлиннее. Выбирай отзывы, в которых игроки рассказывают, что именно им понравилось: люди, постройки, общины, атмосфера. Так их читать интереснее.",
  },
  {
    nick: "Lololowka",
    text: "Здесь будет отзыв. Вставь из Discord и укажите ник типа.",
  },
  {
    nick: "hgyft",
    text: "Короткий отзыв.",
  },
  {
    nick: "persama",
    text: "Отзыв подлиннее. Выбирай отзывы, в которых игроки рассказывают, что именно им понравилось: люди, постройки, общины, атмосфера. Так их читать интереснее.",
  },
];

export function ReviewsSection({ reviews = REVIEWS }: { reviews?: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <Section id="reviews">
      <SectionHeading
        title="Что говорят игроки"
        description="Отзывы тех, кто уже играет на сервере."
      />

      <ul className="columns-1 gap-4 md:columns-2 lg:columns-3">
        {reviews.map((review, i) => (
          <li
            key={`${review.nick}-${i}`}
            className={cn(
              "mb-4 break-inside-avoid rounded-xl bg-card p-6 ring-1 ring-inset ring-foreground/10",
            )}
          >
            <blockquote className="text-pretty leading-relaxed">
              {review.text}
            </blockquote>

            <div className="mt-5 flex items-center gap-3">
              <PlayerHead
                nickname={review.nick}
                className="size-10 rounded-md"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{review.nick}</p>
                {review.source && (
                  <p className="text-xs text-muted-foreground">
                    {review.source}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
