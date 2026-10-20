/**
 * Флаги (баннеры) городов.
 *
 * Флаг это базовый цвет и до BANNER_MAX_LAYERS слоёв "узор + цвет", как у баннеров Minecraft.
 * Хранится и копируется в виде короткого кода:
 *
 *     white|bs:red|cr:black|mc:yellow
 *
 * (базовый цвет, затем слои снизу вверх в формате `узор:цвет`; идентификаторы узоров те же,
 * что в Minecraft: bs, cr, mc...). Кроме собственного кода принимается команда /give из игры
 * или из онлайн-редакторов баннеров (форматы 1.13-1.20.4 и 1.20.5+).
 *
 * Модуль чистый (без React и без обращения к БД), поэтому им пользуются и сервер, и браузер.
 * Картинка рисуется на сетке 20x40, как текстура баннера в игре. Форму узоров мы рисуем сами:
 * она близка к оригиналу, но не пиксель-в-пиксель.
 */

export const BANNER_W = 20;
export const BANNER_H = 40;
export const BANNER_MAX_LAYERS = 16;

/* ------------------------------------------------------------------ */
/* Цвета (порядок = номера красителей Minecraft 0..15)                 */
/* ------------------------------------------------------------------ */

export const DYE_COLORS = [
  { id: "white", label: "Белый", hex: "#F9FFFE" },
  { id: "orange", label: "Оранжевый", hex: "#F9801D" },
  { id: "magenta", label: "Пурпурный", hex: "#C74EBD" },
  { id: "light_blue", label: "Голубой", hex: "#3AB3DA" },
  { id: "yellow", label: "Жёлтый", hex: "#FED83D" },
  { id: "lime", label: "Лаймовый", hex: "#80C71F" },
  { id: "pink", label: "Розовый", hex: "#F38BAA" },
  { id: "gray", label: "Серый", hex: "#474F52" },
  { id: "light_gray", label: "Светло-серый", hex: "#9D9D97" },
  { id: "cyan", label: "Бирюзовый", hex: "#169C9C" },
  { id: "purple", label: "Фиолетовый", hex: "#8932B8" },
  { id: "blue", label: "Синий", hex: "#3C44AA" },
  { id: "brown", label: "Коричневый", hex: "#835432" },
  { id: "green", label: "Зелёный", hex: "#5E7C16" },
  { id: "red", label: "Красный", hex: "#B02E26" },
  { id: "black", label: "Чёрный", hex: "#1D1D21" },
] as const;

export type DyeColor = (typeof DYE_COLORS)[number]["id"];

const COLOR_BY_ID = new Map<string, (typeof DYE_COLORS)[number]>(DYE_COLORS.map((c) => [c.id, c]));

export function isDyeColor(value: string): value is DyeColor {
  return COLOR_BY_ID.has(value);
}

export function dyeHex(color: DyeColor): string {
  return COLOR_BY_ID.get(color)!.hex;
}

/* ------------------------------------------------------------------ */
/* Узоры                                                               */
/* ------------------------------------------------------------------ */

/** Прозрачность узора в пикселе (x, y): 0 - не закрашен, 1 - закрашен полностью. */
type Mask = (x: number, y: number) => number;

const cell = (f: (x: number, y: number, u: number, v: number) => boolean): Mask => {
  return (x, y) => (f(x, y, x + 0.5, y + 0.5) ? 1 : 0);
};

/** Пиксельная картинка из строк ('#' - закрашено) в позиции (ox, oy), увеличенная в scale раз. */
function bitmap(rows: string[], ox: number, oy: number, scale = 2): Mask {
  return (x, y) => {
    const col = Math.floor((x - ox) / scale);
    const row = Math.floor((y - oy) / scale);
    if (x < ox || y < oy || row < 0 || row >= rows.length) return 0;
    return rows[row]?.[col] === "#" ? 1 : 0;
  };
}

const W = BANNER_W;
const H = BANNER_H;
const CX = W / 2;
const CY = H / 2;

/** Расстояние от центра флага. */
const dist = (u: number, v: number) => Math.hypot(u - CX, v - CY);

/** Ступенчатый градиент (8 ступеней), как у настоящей текстуры, и без сотен оттенков в SVG. */
const steps = (alpha: number) => Math.round(Math.min(1, Math.max(0, alpha)) * 8) / 8;

const PATTERN_DEFS = [
  { id: "bs", name: "stripe_bottom", label: "Нижняя полоса", mask: cell((_x, y) => y >= H - 7) },
  { id: "ts", name: "stripe_top", label: "Верхняя полоса", mask: cell((_x, y) => y < 7) },
  { id: "ls", name: "stripe_left", label: "Левая полоса", mask: cell((x) => x < 6) },
  { id: "rs", name: "stripe_right", label: "Правая полоса", mask: cell((x) => x >= W - 6) },
  { id: "cs", name: "stripe_center", label: "Вертикальная полоса", mask: cell((x) => x >= 7 && x < 13) },
  { id: "ms", name: "stripe_middle", label: "Горизонтальная полоса", mask: cell((_x, y) => y >= 17 && y < 23) },
  {
    id: "drs",
    name: "stripe_downright",
    label: "Диагональ \\",
    mask: cell((_x, _y, u, v) => Math.abs(v - 2 * u) <= 4.5),
  },
  {
    id: "dls",
    name: "stripe_downleft",
    label: "Диагональ /",
    mask: cell((_x, _y, u, v) => Math.abs(v - (H - 2 * u)) <= 4.5),
  },
  { id: "ss", name: "small_stripes", label: "Частые полоски", mask: cell((x, y) => y < 31 && (x + 3) % 4 < 2) },
  {
    id: "cr",
    name: "cross",
    label: "Косой крест",
    mask: cell((_x, _y, u, v) => Math.abs(v - 2 * u) <= 3.5 || Math.abs(v - (H - 2 * u)) <= 3.5),
  },
  {
    id: "sc",
    name: "straight_cross",
    label: "Прямой крест",
    mask: cell((x, y) => (x >= 7 && x < 13) || (y >= 17 && y < 23)),
  },
  { id: "ld", name: "diagonal_left", label: "Диагональ: низ слева", mask: cell((_x, _y, u, v) => v > 2 * u) },
  { id: "rd", name: "diagonal_right", label: "Диагональ: низ справа", mask: cell((_x, _y, u, v) => v > H - 2 * u) },
  {
    id: "lud",
    name: "diagonal_up_left",
    label: "Диагональ: верх слева",
    mask: cell((_x, _y, u, v) => v < H - 2 * u),
  },
  { id: "rud", name: "diagonal_up_right", label: "Диагональ: верх справа", mask: cell((_x, _y, u, v) => v < 2 * u) },
  { id: "vh", name: "half_vertical", label: "Левая половина", mask: cell((x) => x < W / 2) },
  { id: "vhr", name: "half_vertical_right", label: "Правая половина", mask: cell((x) => x >= W / 2) },
  { id: "hh", name: "half_horizontal", label: "Верхняя половина", mask: cell((_x, y) => y < H / 2) },
  { id: "hhb", name: "half_horizontal_bottom", label: "Нижняя половина", mask: cell((_x, y) => y >= H / 2) },
  { id: "tl", name: "square_top_left", label: "Квадрат: верх слева", mask: cell((x, y) => x < 8 && y < 8) },
  { id: "tr", name: "square_top_right", label: "Квадрат: верх справа", mask: cell((x, y) => x >= W - 8 && y < 8) },
  { id: "bl", name: "square_bottom_left", label: "Квадрат: низ слева", mask: cell((x, y) => x < 8 && y >= H - 8) },
  {
    id: "br",
    name: "square_bottom_right",
    label: "Квадрат: низ справа",
    mask: cell((x, y) => x >= W - 8 && y >= H - 8),
  },
  {
    id: "bt",
    name: "triangle_bottom",
    label: "Шеврон",
    mask: cell((_x, _y, u, v) => {
      const top = 13 + Math.abs(u - CX) * 1.2;
      return v >= top && v < top + 8;
    }),
  },
  {
    id: "tt",
    name: "triangle_top",
    label: "Перевёрнутый шеврон",
    mask: cell((_x, _y, u, v) => {
      const bottom = 27 - Math.abs(u - CX) * 1.2;
      return v <= bottom && v > bottom - 8;
    }),
  },
  {
    id: "bts",
    name: "triangles_bottom",
    label: "Зубцы снизу",
    mask: cell((_x, _y, u, v) => v >= 31 + (CX - Math.abs(u - CX)) * 0.5),
  },
  {
    id: "tts",
    name: "triangles_top",
    label: "Зубцы сверху",
    mask: cell((_x, _y, u, v) => v <= 8 - (CX - Math.abs(u - CX)) * 0.5),
  },
  { id: "mc", name: "circle", label: "Круг", mask: cell((_x, _y, u, v) => dist(u, v) <= 5.5) },
  {
    id: "mr",
    name: "rhombus",
    label: "Ромб",
    mask: cell((_x, _y, u, v) => Math.abs(u - CX) / 8.5 + Math.abs(v - CY) / 17 <= 1),
  },
  {
    id: "bo",
    name: "border",
    label: "Кайма",
    mask: cell((x, y) => x < 2 || x >= W - 2 || y < 2 || y >= H - 2),
  },
  {
    id: "cbo",
    name: "curly_border",
    label: "Фигурная кайма",
    mask: cell(
      (x, y) =>
        x < 2 ||
        x >= W - 2 ||
        y < 2 ||
        y >= H - 2 ||
        ((x < 4 || x >= W - 4) && y % 4 < 2) ||
        ((y < 4 || y >= H - 4) && x % 4 < 2),
    ),
  },
  {
    id: "bri",
    name: "bricks",
    label: "Кирпичи",
    mask: cell((x, y) => {
      const row = Math.floor(y / 5);
      if (y % 5 === 0) return true;
      return (x + (row % 2) * 5) % 10 === 0;
    }),
  },
  { id: "gra", name: "gradient", label: "Градиент сверху", mask: (_x: number, y: number) => steps(1 - (y + 0.5) / 30) },
  { id: "gru", name: "gradient_up", label: "Градиент снизу", mask: (_x: number, y: number) => steps(1 - (H - (y + 0.5)) / 30) },
  {
    id: "cre",
    name: "creeper",
    label: "Крипер",
    mask: bitmap(["##..##", "##..##", "..##..", ".####.", ".####.", ".#..#."], 4, 14),
  },
  {
    id: "sku",
    name: "skull",
    label: "Череп",
    mask: bitmap([".######.", "########", "##.##.##", "##.##.##", "########", "..####..", "..#..#.."], 2, 13),
  },
  {
    id: "flo",
    name: "flower",
    label: "Цветок",
    mask: bitmap(["..###..", ".#####.", "##...##", "##.#.##", "##...##", ".#####.", "..###.."], 3, 13),
  },
  {
    id: "moj",
    name: "mojang",
    label: "Буква M",
    mask: bitmap(["#.....#", "##...##", "#.#.#.#", "#..#..#", "#.....#", "#.....#"], 3, 14),
  },
  {
    id: "glb",
    name: "globe",
    label: "Глобус",
    mask: cell((_x, _y, u, v) => {
      const d = dist(u, v);
      if (d > 7) return false;
      const ring = d >= 5.2;
      const meridian = Math.abs(u - CX) <= 1 || Math.abs(v - CY) <= 1;
      const ellipse = ((u - CX) / 3.5) ** 2 + ((v - CY) / 7) ** 2;
      return ring || meridian || (ellipse >= 0.7 && ellipse <= 1.2);
    }),
  },
  {
    id: "pig",
    name: "piglin",
    label: "Пятачок",
    mask: cell((x, y) => {
      if (x < 4 || x >= 16 || y < 16 || y >= 24) return false;
      const nostril = y >= 18 && y < 22 && ((x >= 7 && x < 9) || (x >= 11 && x < 13));
      return !nostril;
    }),
  },
] as const;

export type PatternId = (typeof PATTERN_DEFS)[number]["id"];

export interface PatternInfo {
  id: PatternId;
  /** Имя в Minecraft 1.20.5+ (minecraft:<name>) */
  name: string;
  label: string;
  mask: Mask;
}

export const BANNER_PATTERNS: readonly PatternInfo[] = PATTERN_DEFS;

const PATTERN_BY_ID = new Map<string, PatternInfo>(BANNER_PATTERNS.map((p) => [p.id, p]));
const PATTERN_BY_NAME = new Map<string, PatternInfo>(BANNER_PATTERNS.map((p) => [p.name, p]));

export function isPatternId(value: string): value is PatternId {
  return PATTERN_BY_ID.has(value);
}

export function patternInfo(id: PatternId): PatternInfo {
  return PATTERN_BY_ID.get(id)!;
}

/* ------------------------------------------------------------------ */
/* Модель и код                                                         */
/* ------------------------------------------------------------------ */

export interface BannerLayer {
  pattern: PatternId;
  color: DyeColor;
}

export interface Banner {
  base: DyeColor;
  layers: BannerLayer[];
}

export const DEFAULT_BANNER: Banner = { base: "white", layers: [] };

export type ParseResult = { ok: true; banner: Banner } | { ok: false; error: string };

/** Собственный код флага: `white|bs:red|cr:black`. */
export function serializeBanner(banner: Banner): string {
  return [banner.base, ...banner.layers.map((l) => `${l.pattern}:${l.color}`)].join("|");
}

export function parseBannerCode(raw: string): ParseResult {
  const parts = raw.trim().toLowerCase().split("|");
  const base = parts[0]?.trim() ?? "";
  if (!isDyeColor(base)) return { ok: false, error: `Неизвестный цвет «${base}»` };

  const layerParts = parts.slice(1).filter((p) => p.trim() !== "");
  if (layerParts.length > BANNER_MAX_LAYERS) {
    return { ok: false, error: `Слишком много слоёв (максимум ${BANNER_MAX_LAYERS})` };
  }

  const layers: BannerLayer[] = [];
  for (const part of layerParts) {
    const [pattern, color, extra] = part.split(":").map((s) => s.trim());
    if (extra !== undefined || !pattern || !color) {
      return { ok: false, error: `Не удалось разобрать слой «${part}»` };
    }
    if (!isPatternId(pattern)) return { ok: false, error: `Неизвестный узор «${pattern}»` };
    if (!isDyeColor(color)) return { ok: false, error: `Неизвестный цвет «${color}»` };
    layers.push({ pattern, color });
  }
  return { ok: true, banner: { base, layers } };
}

/* ------------------------------------------------------------------ */
/* Команда /give (импорт из игры и онлайн-редакторов, экспорт в игру)   */
/* ------------------------------------------------------------------ */

/** Команда для выдачи баннера в игре (Minecraft 1.20.5+). */
export function toGiveCommand(banner: Banner): string {
  const patterns = banner.layers
    .map((l) => `{pattern:"minecraft:${patternInfo(l.pattern).name}",color:"${l.color}"}`)
    .join(",");
  return `/give @p ${banner.base}_banner[banner_patterns=[${patterns}]]`;
}

function colorFromToken(token: string): DyeColor | null {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) {
    // Старый формат NBT (1.13-1.20.4): номер красителя, 0 = белый ... 15 = чёрный
    return DYE_COLORS[Number(t)]?.id ?? null;
  }
  return isDyeColor(t) ? t : null;
}

function patternFromToken(token: string): PatternInfo | null {
  const t = token.toLowerCase().replace(/^minecraft:/, "");
  return PATTERN_BY_ID.get(t) ?? PATTERN_BY_NAME.get(t) ?? null;
}

function parseGiveCommand(text: string): ParseResult {
  const baseMatch = /\b([a-z_]+)_banner\b/i.exec(text);
  const baseName = baseMatch?.[1]?.toLowerCase();
  if (!baseName || !isDyeColor(baseName)) {
    return { ok: false, error: "Не нашёл баннер в команде (ожидается что-то вроде white_banner[...])" };
  }

  const layers: BannerLayer[] = [];
  for (const [object] of text.matchAll(/\{[^{}]*\}/g)) {
    const pattern = /["']?pattern["']?\s*[:=]\s*["']?([a-z_:0-9]+)["']?/i.exec(object)?.[1];
    const color = /["']?color["']?\s*[:=]\s*["']?([a-z_0-9]+)["']?/i.exec(object)?.[1];
    if (!pattern || !color) continue;

    const info = patternFromToken(pattern);
    if (!info) return { ok: false, error: `Неизвестный узор «${pattern}»` };
    const dye = colorFromToken(color);
    if (!dye) return { ok: false, error: `Неизвестный цвет «${color}»` };
    layers.push({ pattern: info.id, color: dye });
  }
  if (layers.length > BANNER_MAX_LAYERS) {
    return { ok: false, error: `Слишком много слоёв (максимум ${BANNER_MAX_LAYERS})` };
  }
  return { ok: true, banner: { base: baseName, layers } };
}

/** Принимает собственный код флага или команду /give. */
export function parseBannerInput(raw: string): ParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Вставьте код флага" };
  if (text.length > 4000) return { ok: false, error: "Слишком длинный текст" };

  const looksLikeOwnCode = /^[a-z_]+(\s*\|\s*[a-z]+\s*:\s*[a-z_]+)*$/i.test(text);
  if (looksLikeOwnCode) return parseBannerCode(text.replace(/\s+/g, ""));
  return parseGiveCommand(text);
}

/* ------------------------------------------------------------------ */
/* Рисование                                                            */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Цвет каждого пикселя флага (строки сверху вниз), слои накладываются по порядку. */
export function renderBannerPixels(banner: Banner): string[][] {
  const base = hexToRgb(dyeHex(banner.base));
  const grid: [number, number, number][][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => [...base] as [number, number, number]),
  );

  for (const layer of banner.layers) {
    const mask = patternInfo(layer.pattern).mask;
    const rgb = hexToRgb(dyeHex(layer.color));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = mask(x, y);
        if (a <= 0) continue;
        const px = grid[y][x];
        grid[y][x] = a >= 1 ? rgb : [px[0] + (rgb[0] - px[0]) * a, px[1] + (rgb[1] - px[1]) * a, px[2] + (rgb[2] - px[2]) * a];
      }
    }
  }
  return grid.map((row) => row.map(rgbToHex));
}

/**
 * Флаг в виде набора SVG-путей: по одному на цвет, горизонтальные отрезки одного цвета склеены.
 * Так картинка весит сотни байт, а не тысячи прямоугольников.
 */
export function bannerSvgPaths(banner: Banner): { color: string; d: string }[] {
  const pixels = renderBannerPixels(banner);
  const byColor = new Map<string, string[]>();

  pixels.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === color) end++;
      const list = byColor.get(color) ?? [];
      list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
      byColor.set(color, list);
      x = end;
    }
  });

  return [...byColor].map(([color, parts]) => ({ color, d: parts.join("") }));
}
