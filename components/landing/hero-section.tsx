"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button } from "../ui/button";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { SERVER_IP } from "@/lib/data";

const SUBTITLE =
  "Место, где начинается твоя история. Исследуй мир, создавая удивительные постройки и объединяйся с другими игроками, чтобы превратить обычное выживание в настоящее приключение.";
const WORDS = SUBTITLE.split(" ");

const SHOW_SUBTITLE_AT = 800;
const SLIDE_LEFT_AT = 1800;

const EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];
const MOVE = { duration: 0.9, ease: EASE };

const BUTTONS = [
  {
    label: "Авторизоваться",
    variant: "default",
  },
  { label: "Подробнее", variant: "secondary", href: "/#features" },
] as const;

type Step = 0 | 1 | 2;

type ServerStatus = {
  online: boolean;
  players?: {
    online: number;
    max: number;
    list?: {
      name: string;
      uuid: string;
    }[];
  };
  version: string;
};

export function HeroSection({
  image = "/images/steve.png",
}: {
  image?: string;
}) {
  const [step, setStep] = useState<Step>(0);
  const [server, setServer] = useState<ServerStatus | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), SHOW_SUBTITLE_AT);
    const t2 = setTimeout(() => setStep(2), SLIDE_LEFT_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(setServer)
      .catch(console.error);
  }, []);

  const isFinal = step === 2;
  const align = isFinal ? "self-start" : "self-center";

  const randomPlayer = useMemo(() => {
    if (!server?.online) return null;
    const players = server?.players?.list ?? [];

    if (players.length === 0) return null;

    return players[Math.floor(Math.random() * players.length)];
  }, [server?.players?.list]);

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative isolate flex min-h-screen items-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div className="absolute inset-0 bg-radial-[at_50%_0%] from-green-600/15 to-transparent to-60% dark:from-green-600/10" />

          {/* Сетка */}
          <div className="absolute inset-0 opacity-35 dark:opacity-20 bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-size-[72px_72px] mask-[radial-gradient(ellipse_at_center,black_10%,transparent_80%)]" />

          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-emerald-100/50 dark:to-primary/5" />
        </div>

        <div
          className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-6 pt-28 pb-16 lg:flex-row lg:px-10 ${
            isFinal ? "lg:justify-between" : "lg:justify-center"
          }`}
        >
          {/* Левая колонка */}
          <div className="flex w-full max-w-xl flex-col">
            <motion.div
              layout="position"
              transition={{ layout: MOVE }}
              className={align}
            >
              <motion.h1
                initial={{
                  opacity: 0,
                  scale: 0.5,
                  y: 80,
                  filter: "blur(16px)",
                }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 140, damping: 16 }}
                className="text-4xl md:text-5xl lg:text-7xl title text-green-400"
              >
                Tuesday
              </motion.h1>
            </motion.div>

            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  key="subtitle"
                  exit={{ opacity: 0 }}
                  className={`mt-4 ${align}`}
                >
                  <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                    className={`max-w-lg text-balance text-base leading-relaxed sm:text-lg ${
                      isFinal ? "text-left" : "text-center"
                    }`}
                  >
                    {WORDS.map((word, i) => (
                      <Fragment key={i}>
                        <motion.span
                          layout="position"
                          transition={{ layout: MOVE }}
                          className="inline-block"
                        >
                          {word}
                        </motion.span>{" "}
                      </Fragment>
                    ))}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {step >= 1 && (
              <div className={`mt-5 flex flex-col gap-5 ${align}`}>
                <div className="flex gap-3">
                  {BUTTONS.map((button, i) => {
                    return (
                      <motion.div
                        key={button.label}
                        initial={{ opacity: 0, y: 48 }}
                        animate={
                          isFinal ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }
                        }
                        transition={{
                          duration: 0.7,
                          ease: EASE,
                          delay: isFinal ? 0.35 + i * 0.12 : 0,
                        }}
                        className={`transition-[background-color,filter] ${isFinal ? "" : "pointer-events-none"}`}
                      >
                        <Button
                          tabIndex={isFinal ? 0 : -1}
                          aria-hidden={!isFinal}
                          size={"lg"}
                          variant={button.variant}
                          title={"href" in button ? button.href : "Привет"}
                        >
                          {button.label}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 48 }}
                  animate={
                    isFinal ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }
                  }
                  transition={{
                    duration: 0.7,
                    ease: EASE,
                    delay: isFinal ? 0.35 + 2 * 0.12 : 0,
                  }}
                  className="flex flex-col w-full"
                >
                  <IpChip online={server?.online} className="sm:w-70 w-full" />

                  {server?.online && (
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground font-minecraft">
                      <span>
                        {server?.players?.online ?? 0}/
                        {server?.players?.max ?? 0}
                      </span>

                      <span>
                        {server.version?.replace("Leaf", "Java") ?? ""}
                      </span>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </div>

          {/* Правая часть */}
          <AnimatePresence>
            {isFinal && (
              <motion.div
                key="card"
                initial={{ opacity: 0, x: 120, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 120, scale: 0.94 }}
                transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                className="relative aspect-square w-full max-w-150"
              >
                <div className="absolute inset-x-0 bottom-0 h-90 overflow-hidden rounded-xl">
                  <div className="pointer-events-none absolute inset-0 bg-radial-[at_60%_100%] from-lime-200 via-green-500 to-emerald-700" />

                  {randomPlayer && (
                    <p className="absolute left-1/2 bg-background/75 backdrop-blur-lg ring-1 ring-border rounded-md px-3 py-1 -translate-x-1/2 bottom-5 text-lg font-minecraft whitespace-nowrap z-15">
                      {randomPlayer.name} играет!!!
                    </p>
                  )}
                </div>

                <Image
                  src={image}
                  alt="Рендер Стива"
                  fill
                  draggable={false}
                  priority
                  sizes="(min-width: 1024px) 600px, 100vw"
                  className="z-10 object-contain object-bottom select-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </MotionConfig>
  );
}

function IpChip({
  className,
  online,
}: {
  className?: string;
  online?: boolean | false;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      setCopied(true);
    } catch {
      // Буфер недоступен
    }
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={copy}
        variant={"outline"}
        aria-label={`Скопировать IP сервера ${SERVER_IP}`}
        className={cn("gap-2.5 justify-start", className)}
        title={online ? "Скопировать IP сервера" : "Сервер оффлайн"}
      >
        <span className="relative flex size-2 shrink-0" aria-hidden>
          <span
            className={cn(
              "absolute size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none",
              online ? "inline-flex" : "hidden",
            )}
          />
          <span
            className={cn(
              "relative size-2 inline-flex rounded-full bg-primary",
              online ? "bg-primary" : "bg-muted",
            )}
          />
        </span>

        <span className="relative inline-flex min-w-34 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? "copied" : "ip"}
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08, ease: EASE }}
              className={cn(
                "whitespace-nowrap text-sm",
                copied
                  ? "text-primary font-sans font-medium"
                  : "font-minecraft mt-0.5",
              )}
            >
              {copied ? "Скопировано!" : SERVER_IP}
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>

      <Button
        size={"icon-lg"}
        className="hidden sm:inline-flex"
        aria-label={`Скопировать IP сервера ${SERVER_IP}`}
        onClick={copy}
      >
        {copied ? (
          <CheckIcon className="size-4 shrink-0" weight="bold" />
        ) : (
          <CopyIcon className="size-4 shrink-0" weight="bold" />
        )}
      </Button>
    </div>
  );
}
