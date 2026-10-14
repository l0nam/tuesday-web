"use client";

import { useEffect, useMemo, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { Section } from "../ui/section";

type Stat = {
  label: string;
  value: number;
  from?: number;
  decimals?: number;
  suffix?: string;
  grouping?: boolean;
};

const STATS: Stat[] = [
  { label: "Пик онлайна", value: 100 },
  { label: "Год запуска", value: 2025, grouping: false },
  { label: "Игроков за всё время", value: 1000, suffix: "+" },
  { label: "Аптайм", value: 99.9, decimals: 1, suffix: "%" },
];

function CountUp({
  value,
  from = 0,
  decimals = 0,
  grouping = true,
  duration = 2.2,
}: Pick<Stat, "value" | "from" | "decimals" | "grouping"> & {
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouping,
      }),
    [decimals, grouping],
  );

  useEffect(() => {
    const node = ref.current;
    if (!inView || !node) return;

    if (reduceMotion) {
      node.textContent = formatter.format(value);
      return;
    }

    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = formatter.format(latest);
      },
    });
    return () => controls.stop();
  }, [inView, reduceMotion, formatter, from, value, duration]);

  return (
    <>
      <span className="sr-only">{formatter.format(value)}</span>
      <span ref={ref} aria-hidden className="tabular-nums">
        {formatter.format(from)}
      </span>
    </>
  );
}

export function StatsCounters() {
  return (
    <Section className="py-10 sm:py-14 relative w-full">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4 z-10">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col-reverse gap-2 bg-card px-6 py-8 sm:px-8 sm:py-10"
          >
            <dt className="text-sm text-muted-foreground sm:text-base">
              {stat.label}
            </dt>
            <dd className="title text-4xl sm:text-5xl">
              <CountUp
                value={stat.value}
                from={stat.from}
                decimals={stat.decimals}
                grouping={stat.grouping}
              />

              {stat.suffix && (
                <span className="text-muted-foreground">{stat.suffix}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
