"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "cn";
import { Section } from "../ui/section";
import { CaretDownIcon, LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { LINKS } from "@/lib/data";

type Faq = { question: string; answer: string };
const FAQ: Faq[] = [
  {
    question: "Как зайти на сервер?",
    answer:
      "Скопируйте адрес сервера в виджете вверху страницы и добавьте его в список серверов в игре. Затем авторизуйтесь на сайте, чтобы пользоваться профилем и кошельком.",
  },
  {
    question: "Какая версия игры нужна?",
    answer:
      "Актуальная версия указана на главном экране, рядом с адресом сервера.",
  },
  {
    question: "Что такое общины?",
    answer:
      "Это объединения игроков со своей страницей на сайте. Можно вступить в готовую общину или собрать свою и вместе строить город.",
  },
  {
    question: "Где посмотреть свою статистику?",
    answer:
      "Наигранные часы и рейтинг игроков собраны на странице «Статистика». Свою статистику можно посмотреть в профиле.",
  },
  {
    question: "Как работает кошелёк?",
    answer:
      "Баланс привязан к вашему игровому аккаунту. Получайте Вторнички за достижения в игре, создание общины минимум на 10 человек, наигранное время на сервере и участие в общественной жизни сервера. Валюту можно обменять на предметы в магазине.",
  },
  {
    question: "Где найти правила и гайды?",
    answer: "Все правила, команды и гайды собраны в вики сервера.",
  },
];

function FaqItem({
  item,
  open,
  onToggle,
  id,
}: {
  item: Faq;
  open: boolean;
  onToggle: () => void;
  id: string;
}) {
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <li className="border-b border-border first:border-t">
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            "flex w-full items-center justify-between gap-6 py-5 text-base font-medium outline-none transition-colors duration-300 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-lg",
            open && "text-primary",
          )}
        >
          {item.question}
          <CaretDownIcon
            weight="bold"
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
              open && "rotate-180 text-primary",
            )}
          />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-5 text-pretty leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function FaqSection() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="title text-3xl md:text-4xl">Частые вопросы</h2>
          <p className="mt-4 max-w-sm text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Не нашли ответ? Загляните в{" "}
            <Link
              href={LINKS["wiki"].link}
              target="_blank"
              className="link inline-flex items-center gap-0.5"
            >
              вики <LinkIcon weight="bold" className="text-sm" />
            </Link>
            .
          </p>
        </div>

        <ul>
          {FAQ.map((item, i) => (
            <FaqItem
              key={item.question}
              id={`${baseId}-${i}`}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </ul>
      </div>
    </Section>
  );
}
