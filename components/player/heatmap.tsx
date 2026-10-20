import type { HeatCell, HeatLevel } from "@/lib/profile/stats";
import { formatHours } from "@/lib/profile/stats";
import { cn } from "cn";

const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/50",
  3: "bg-primary/75",
  4: "bg-primary",
};

const MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function dateLabel(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function Heatmap({ columns }: { columns: HeatCell[][] }) {
  const monthLabels = columns.map((column, i) => {
    const first =
      column.find((c) => c.day.endsWith("-01")) ??
      (i === 0 ? column[0] : undefined);
    return first ? MONTHS[Number(first.day.split("-")[1]) - 1] : "";
  });
  if (monthLabels[1] || monthLabels[2]) monthLabels[0] = "";

  return (
    <div className="flex flex-row-reverse overflow-x-auto pb-1">
      <div className="min-w-75 flex-1">
        <div className="flex gap-2">
          <div
            className="grid grid-rows-[12px_repeat(7,1fr)] gap-0.75 text-[10px] leading-none text-muted-foreground"
            aria-hidden
          >
            <span />
            {["Пн", "", "Ср", "", "Пт", "", "Вс"].map((label, i) => (
              <span key={i} className="flex items-center">
                {label}
              </span>
            ))}
          </div>

          <div
            className="flex flex-1 gap-0.75"
            role="img"
            aria-label="Активность игрока по дням за последние полгода"
          >
            {columns.map((column, i) => (
              <div
                key={column[0].day}
                className="grid min-w-0 flex-1 grid-rows-[12px_repeat(7,auto)] gap-0.75"
              >
                <span className="relative h-3 text-[10px] leading-none text-muted-foreground">
                  <span className="absolute top-0 left-0 whitespace-nowrap">
                    {monthLabels[i]}
                  </span>
                </span>

                {column.map((cell) =>
                  cell.inFuture ? (
                    <span key={cell.day} className="aspect-square w-full" />
                  ) : (
                    <span
                      key={cell.day}
                      title={`${dateLabel(cell.day)}: ${cell.seconds > 0 ? `${formatHours(cell.seconds)} ч` : cell.level === 0 ? "не заходил" : "заходил"}`}
                      className={cn(
                        "aspect-square w-full rounded",
                        LEVEL_CLASS[cell.level],
                      )}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
