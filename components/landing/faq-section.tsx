"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Section } from "../ui/section";
import { LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { LINKS } from "@/lib/data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

type Faq = { question: string; answer: string };
const FAQ: Faq[] = [
  {
    question: "Как зайти на сервер?",
    answer:
      "Попасть на сервер можно по проходке. Ее можно купить на сайте доната или получить бесплатно заполним анкету в дискорде. Затем авторизуйтесь на сайте, чтобы пользоваться профилем и кошельком.",
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

export function FaqSection() {
  const firstQuestion = FAQ[0].question;
  const [open, setOpen] = useState<string[]>([firstQuestion]);

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
              rel="noopener noreferrer"
              className="link inline-flex items-center gap-0.5"
            >
              вики <LinkIcon weight="bold" className="text-sm" />
            </Link>{" "}
            или задайте свой вопрос в{" "}
            <Link
              href={LINKS["discord"].link}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex items-center gap-0.5"
            >
              дискорд <LinkIcon weight="bold" className="text-sm" />
            </Link>
            .
          </p>
        </div>

        <Accordion value={open} onValueChange={setOpen}>
          {FAQ.map((item) => {
            const isOpen = open.includes(item.question);

            return (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger
                  className={cn(
                    "hover:text-primary text-base sm:text-lg",
                    isOpen && "text-primary",
                  )}
                >
                  {item.question}
                </AccordionTrigger>

                <AccordionContent className="text-base">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </Section>
  );
}
