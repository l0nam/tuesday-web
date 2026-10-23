import { crc32, deflateSync } from "node:zlib";
import { z } from "zod";

/**
 * Скины игроков для 3D-просмотрщика. Браузер не ходит в Mojang сам: сайт забирает скин, проверяет
 * и отдаёт со своего адреса (нет проблем с CORS, один кэш на всех посетителей, Mojang не видит каждого зрителя).
 *
 * Защита:
 *  - адрес текстуры берётся из ответа Mojang и принимается, только если это https://textures.minecraft.net
 *    (иначе подмена адреса превратила бы сайт в прокси к любому серверу: SSRF);
 *  - редиректы запрещены, размер ограничен, содержимое проверяется как PNG 64x64 / 64x32;
 *  - любой сбой (нет скина, Mojang недоступен, мусор вместо PNG) = запасной скин, страница не ломается.
 */

const SESSION_BASE = "https://sessionserver.mojang.com";
const DEFAULT_ALLOWED_ORIGINS = ["https://textures.minecraft.net"];
const MAX_SKIN_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 3_000;
const CACHE_LIMIT = 500;

/** Сколько секунд хранить результат разных исходов (в памяти и в Cache-Control). */
export const SKIN_TTL = { found: 60 * 60, none: 10 * 60, error: 60 } as const;

export interface SkinResult {
  png: Buffer;
  source: "mojang" | "default";
  /** На сколько секунд результат можно кэшировать */
  ttl: number;
}

export interface SkinOptions {
  /** Только для тестов */
  sessionBase?: string;
  allowedOrigins?: string[];
}

/* ------------------------------- проверка PNG ------------------------------- */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buf.toString("latin1", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function isValidSkinPng(buf: Buffer): boolean {
  const dims = pngDimensions(buf);
  return Boolean(dims && dims.width === 64 && (dims.height === 64 || dims.height === 32));
}

/* --------------------------- ответ сервера Mojang --------------------------- */

const profileSchema = z.object({
  properties: z.array(z.object({ name: z.string(), value: z.string() })),
});
const texturesSchema = z.object({
  textures: z.object({
    SKIN: z.object({ url: z.string(), metadata: z.object({ model: z.string().optional() }).optional() }).optional(),
  }),
});

/** Достаёт адрес скина из ответа sessionserver (свойство textures: base64 от JSON). */
export function parseSkinUrl(profileJson: unknown): { url: string; slim: boolean } | null {
  const profile = profileSchema.safeParse(profileJson);
  if (!profile.success) return null;
  const property = profile.data.properties.find((p) => p.name === "textures");
  if (!property) return null;
  try {
    const decoded = JSON.parse(Buffer.from(property.value, "base64").toString("utf8"));
    const parsed = texturesSchema.safeParse(decoded);
    const skin = parsed.success ? parsed.data.textures.SKIN : undefined;
    if (!skin) return null;
    return { url: skin.url, slim: skin.metadata?.model === "slim" };
  } catch {
    return null;
  }
}

export function isAllowedTextureUrl(raw: string, allowedOrigins: readonly string[] = DEFAULT_ALLOWED_ORIGINS): boolean {
  try {
    const url = new URL(raw);
    if (url.username || url.password) return false;
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

/* -------------------------------- запасной скин -------------------------------- */

type Rgba = [number, number, number, number];

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // фильтр "None"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // глубина цвета
  header[9] = 6; // RGBA
  return Buffer.concat([PNG_SIGNATURE, pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}

let defaultSkinCache: Buffer | undefined;

/**
 * Запасной скин, нарисованный кодом (собственный, не из игры): зелёная футболка в цвет сайта.
 * Раскладка 64x64 стандартная для Minecraft; внешние слои (шапка, рукава) оставлены прозрачными.
 */
export function defaultSkinPng(): Buffer {
  if (defaultSkinCache) return defaultSkinCache;

  const W = 64;
  const rgba = Buffer.alloc(W * W * 4); // всё прозрачное
  const fill = (x: number, y: number, w: number, h: number, c: Rgba) => {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) {
        const i = (yy * W + xx) * 4;
        rgba[i] = c[0];
        rgba[i + 1] = c[1];
        rgba[i + 2] = c[2];
        rgba[i + 3] = c[3];
      }
    }
  };

  const SKIN: Rgba = [222, 184, 150, 255];
  const HAIR: Rgba = [62, 44, 32, 255];
  const SHIRT: Rgba = [38, 150, 88, 255];
  const PANTS: Rgba = [52, 66, 98, 255];
  const SHOES: Rgba = [38, 40, 48, 255];
  const WHITE: Rgba = [245, 245, 245, 255];
  const PUPIL: Rgba = [44, 62, 140, 255];
  const MOUTH: Rgba = [152, 84, 72, 255];

  // Голова
  fill(0, 0, 32, 16, SKIN);
  fill(8, 0, 8, 8, HAIR); // макушка
  fill(0, 8, 32, 2, HAIR); // волосы по кругу (правая, лицо, левая, затылок)
  fill(24, 8, 8, 8, HAIR); // затылок целиком
  fill(9, 11, 2, 1, WHITE); // глаза
  fill(13, 11, 2, 1, WHITE);
  fill(10, 11, 1, 1, PUPIL);
  fill(13, 11, 1, 1, PUPIL);
  fill(11, 14, 2, 1, MOUTH); // рот

  // Туловище
  fill(16, 16, 24, 16, SHIRT);

  // Правая нога и рука, левая нога и рука (рукава как футболка, ниже кожа, обувь)
  const leg = (x: number, y: number) => {
    fill(x, y, 16, 16, PANTS);
    fill(x, y + 12, 16, 4, SHOES);
  };
  const arm = (x: number, y: number) => {
    fill(x, y, 16, 16, SKIN);
    fill(x, y, 16, 8, SHIRT);
  };
  leg(0, 16);
  arm(40, 16);
  leg(16, 48);
  arm(32, 48);

  defaultSkinCache = encodePng(W, W, rgba);
  return defaultSkinCache;
}

/* ------------------------------- загрузка скина ------------------------------- */

const cache = new Map<string, { value: SkinResult; expires: number }>();
const inflight = new Map<string, Promise<SkinResult>>();

function fallback(ttl: number): SkinResult {
  return { png: defaultSkinPng(), source: "default", ttl };
}

async function fetchLimited(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

async function downloadSkin(uuid: string, opts: SkinOptions): Promise<SkinResult> {
  try {
    const profileRes = await fetchLimited(`${opts.sessionBase ?? SESSION_BASE}/session/minecraft/profile/${uuid}`);
    if (profileRes.status === 204 || profileRes.status === 404) return fallback(SKIN_TTL.none);
    if (!profileRes.ok) {
      if (profileRes.status === 429) console.warn("[skin] Mojang ограничил частоту запросов");
      return fallback(SKIN_TTL.error);
    }

    const texture = parseSkinUrl(await profileRes.json());
    if (!texture) return fallback(SKIN_TTL.none); // у игрока нет собственного скина
    if (!isAllowedTextureUrl(texture.url, opts.allowedOrigins)) {
      console.warn("[skin] адрес текстуры вне разрешённого списка, использую запасной скин");
      return fallback(SKIN_TTL.none);
    }

    const skinRes = await fetchLimited(texture.url);
    if (!skinRes.ok) return fallback(SKIN_TTL.error);
    const declared = Number(skinRes.headers.get("content-length") ?? 0);
    if (declared > MAX_SKIN_BYTES) return fallback(SKIN_TTL.none);

    const png = Buffer.from(await skinRes.arrayBuffer());
    if (png.length > MAX_SKIN_BYTES || !isValidSkinPng(png)) return fallback(SKIN_TTL.none);
    return { png, source: "mojang", ttl: SKIN_TTL.found };
  } catch (error) {
    console.warn("[skin] не удалось получить скин:", (error as Error).message);
    return fallback(SKIN_TTL.error);
  }
}

/** Скин игрока (PNG) с кэшем в памяти и объединением одновременных запросов. Никогда не бросает. */
export async function getSkin(uuid: string, opts: SkinOptions = {}): Promise<SkinResult> {
  const hit = cache.get(uuid);
  if (hit && hit.expires > Date.now()) return hit.value;

  const pending = inflight.get(uuid);
  if (pending) return pending;

  const job = downloadSkin(uuid, opts)
    .then((value) => {
      cache.delete(uuid);
      cache.set(uuid, { value, expires: Date.now() + value.ttl * 1000 });
      if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
      return value;
    })
    .finally(() => inflight.delete(uuid));
  inflight.set(uuid, job);
  return job;
}
