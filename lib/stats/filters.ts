export const PERIODS = [
  { key: "all", label: "Все" },
  { key: "online", label: "Онлайн" },
  { key: "month", label: "Месяц" },
  { key: "week", label: "Неделя" },
  { key: "yesterday", label: "Вчера" },
  { key: "today", label: "Сегодня" },
] as const;

export const SORTS = [
  { key: "time_desc", label: "Наигранное время: больше" },
  { key: "time_asc", label: "Наигранное время: меньше" },
  { key: "recent", label: "Недавно заходили" },
  { key: "name", label: "Ник: А — Я" },
] as const;

export type Period = (typeof PERIODS)[number]["key"];
export type Sort = (typeof SORTS)[number]["key"];

export const PLAYERS_PER_PAGE = 24;
export const SEARCH_MAX_LENGTH = 16;

export interface PlayersQuery {
  q: string;
  period: Period;
  sort: Sort;
  page: number;
}

export const DEFAULT_QUERY: PlayersQuery = {
  q: "",
  period: "all",
  sort: "time_desc",
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parsePlayersQuery(params: RawParams): PlayersQuery {
  const period =
    PERIODS.find((p) => p.key === first(params.period))?.key ??
    DEFAULT_QUERY.period;
  const sort =
    SORTS.find((s) => s.key === first(params.sort))?.key ?? DEFAULT_QUERY.sort;
  const q = (first(params.q) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const page = Number(first(params.page));
  return {
    q,
    period,
    sort,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function playersHref(query: PlayersQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.period !== DEFAULT_QUERY.period) params.set("period", query.period);
  if (query.sort !== DEFAULT_QUERY.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const text = params.toString();
  return text ? `/stats?${text}#players` : "/stats#players";
}
