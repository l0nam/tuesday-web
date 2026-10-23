"use client";

import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "cn";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { pluralRu } from "@/lib/utils/formatting";

export interface ChartPoint {
  t: number;
  v: number;
}

const HOUR = 3_600_000;
const RANGES = [
  { key: "24h", label: "24 часа", ms: 24 * HOUR },
  { key: "7d", label: "7 дней", ms: 7 * 24 * HOUR },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function niceTop(max: number): number {
  const step =
    [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(
      (s) => s * 4 >= max,
    ) ?? Math.ceil(max / 4);
  return step * 4;
}

function localMinutes(t: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(t);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export function OnlineChart({
  points,
  now,
  stepMs,
  timeZone,
}: {
  points: ChartPoint[];
  now: number;
  stepMs: number;
  timeZone: string;
}) {
  const gradientId = useId();
  const [rangeKey, setRangeKey] = useState<RangeKey>("24h");
  const [active, setActive] = useState<number | null>(null);
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0];

  const chart = useMemo(() => {
    const visible = points.filter((p) => p.t >= now - range.ms);
    if (visible.length === 0) return null;

    const x0 = visible[0].t;
    const x1 = Math.max(visible[visible.length - 1].t, x0 + stepMs);
    const peak = Math.max(...visible.map((p) => p.v));
    const top = niceTop(peak);
    const x = (t: number) => ((t - x0) / (x1 - x0)) * 100;
    const y = (v: number) => 100 - (v / top) * 100;

    const segments: ChartPoint[][] = [];
    for (const p of visible) {
      const last = segments[segments.length - 1];
      if (last && p.t - last[last.length - 1].t <= stepMs * 2.5) last.push(p);
      else segments.push([p]);
    }
    const line = segments
      .map(
        (s) =>
          s
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${x(p.t).toFixed(3)} ${y(p.v).toFixed(3)}`,
            )
            .join(" ") +
          (s.length === 1
            ? ` L${x(s[0].t).toFixed(3)} ${y(s[0].v).toFixed(3)}`
            : ""),
      )
      .join(" ");
    const area = segments
      .filter((s) => s.length > 1)
      .map(
        (s) =>
          `M${x(s[0].t).toFixed(3)} 100 ` +
          s.map((p) => `L${x(p.t).toFixed(3)} ${y(p.v).toFixed(3)}`).join(" ") +
          ` L${x(s[s.length - 1].t).toFixed(3)} 100 Z`,
      )
      .join(" ");

    const tickStep = rangeKey === "24h" ? 4 * 60 : 24 * 60;
    const minutes = localMinutes(x0, timeZone);
    const firstTick =
      x0 + (Math.ceil(minutes / tickStep) * tickStep - minutes) * 60_000;
    const ticks: number[] = [];
    for (let t = firstTick; t <= x1; t += tickStep * 60_000) ticks.push(t);

    return {
      visible,
      x0,
      x1,
      peak,
      top,
      x,
      y,
      line,
      area,
      ticks,
      yTicks: [0, 1, 2, 3, 4].map((i) => (top / 4) * i),
    };
  }, [points, now, range.ms, rangeKey, stepMs, timeZone]);

  const axisFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("ru", {
        timeZone,
        ...(rangeKey === "24h"
          ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
          : { weekday: "short", day: "numeric" }),
      }),
    [timeZone, rangeKey],
  );
  const tipFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("ru", {
        timeZone,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    [timeZone],
  );

  const point =
    chart && active !== null
      ? chart.visible[Math.min(active, chart.visible.length - 1)]
      : null;
  const unit = (n: number) => pluralRu(n, "игрок", "игрока", "игроков");

  function select(clientX: number, rect: DOMRect) {
    if (!chart) return;
    const target =
      chart.x0 +
      Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) *
        (chart.x1 - chart.x0);
    let best = 0;
    for (let i = 1; i < chart.visible.length; i += 1) {
      if (
        Math.abs(chart.visible[i].t - target) <
        Math.abs(chart.visible[best].t - target)
      )
        best = i;
    }
    setActive(best);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!chart) return;
    const last = chart.visible.length - 1;
    const keys: Record<string, number> = {
      ArrowLeft: Math.max(0, (active ?? last) - 1),
      ArrowRight: Math.min(last, (active ?? last) + 1),
      Home: 0,
      End: last,
    };
    if (event.key in keys) {
      event.preventDefault();
      setActive(keys[event.key]);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {chart ? (
            <>
              Пик за период:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {chart.peak}
              </span>
            </>
          ) : (
            "Онлайн сервера"
          )}

          <span className="hidden sm:inline">
            {" "}
            · замер раз в {Math.round(stepMs / 60_000)} минут
          </span>
        </p>

        <Tabs>
          <TabsList aria-label="Период графика">
            {RANGES.map((r) => (
              <TabsTrigger
                key={r.key}
                value={r}
                aria-pressed={r.key === rangeKey}
                onClick={() => {
                  setRangeKey(r.key);
                  setActive(null);
                }}
              >
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="relative h-56 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5 sm:h-64">
        {!chart ? (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
            Данных пока нет. График заполнится после первых замеров онлайна.
          </p>
        ) : (
          <div
            role="group"
            tabIndex={0}
            aria-roledescription="график"
            aria-label={`Онлайн сервера за ${range.label.toLowerCase()}.`}
            onKeyDown={onKeyDown}
            onFocus={() =>
              active === null && setActive(chart.visible.length - 1)
            }
            onBlur={() => setActive(null)}
            className="relative size-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div
              className="absolute inset-y-2 right-2 left-8 bottom-6"
              style={{ touchAction: "pan-y" }}
              onPointerMove={(e: PointerEvent<HTMLDivElement>) =>
                select(e.clientX, e.currentTarget.getBoundingClientRect())
              }
              onPointerDown={(e: PointerEvent<HTMLDivElement>) =>
                select(e.clientX, e.currentTarget.getBoundingClientRect())
              }
              onPointerLeave={() => setActive(null)}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
                className="absolute inset-0 size-full overflow-visible text-primary"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity="0.22"
                    />
                    <stop
                      offset="100%"
                      stopColor="currentColor"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                {chart.yTicks.map((tick) => (
                  <line
                    key={tick}
                    x1="0"
                    x2="100"
                    y1={chart.y(tick)}
                    y2={chart.y(tick)}
                    stroke="currentColor"
                    className="text-foreground"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <path d={chart.area} fill={`url(#${gradientId})`} />

                <path
                  d={chart.line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {chart.yTicks.map((tick) => (
                <span
                  key={tick}
                  aria-hidden
                  className="pointer-events-none absolute right-full -translate-y-1/2 pr-2 text-xs text-muted-foreground tabular-nums"
                  style={{ top: `${chart.y(tick)}%` }}
                >
                  {tick}
                </span>
              ))}

              {chart.ticks.map((tick) => (
                <span
                  key={tick}
                  aria-hidden
                  className="pointer-events-none absolute top-full -translate-x-1/2 pt-1.5 text-xs whitespace-nowrap text-muted-foreground"
                  style={{ left: `${chart.x(tick)}%` }}
                >
                  {axisFormat.format(tick)}
                </span>
              ))}

              {point && (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 w-px bg-foreground/30"
                    style={{ left: `${chart.x(point.t)}%` }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
                    style={{
                      left: `${chart.x(point.t)}%`,
                      top: `${chart.y(point.v)}%`,
                    }}
                  />
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute top-0 z-10 rounded-lg bg-popover px-3 py-2 text-popover-foreground shadow-md ring-1 ring-foreground/10",
                      chart.x(point.t) > 60
                        ? "-translate-x-[calc(100%+12px)]"
                        : "translate-x-3",
                    )}
                    style={{ left: `${chart.x(point.t)}%` }}
                  >
                    <p className="text-sm font-semibold whitespace-nowrap tabular-nums">
                      {point.v} {unit(point.v)}
                    </p>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                      {tipFormat.format(point.t)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {point
          ? `${tipFormat.format(point.t)}: ${point.v} ${unit(point.v)}`
          : ""}
      </p>
    </div>
  );
}
