import { eq, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcProfile } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600";
const UUID_REGEX =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const NICKNAME_REGEX = /^[a-zA-Z0-9_]{1,16}$/;
const TEXTURE_URL_REGEX =
  /^https:\/\/textures\.minecraft\.net\/texture\/([a-f0-9]{32,128})$/i;

async function getStoredTextureId(username: string): Promise<string | null> {
  try {
    let [profile] = await db
      .select({ skinUrl: mcProfile.skinUrl })
      .from(mcProfile)
      .where(eq(mcProfile.name, username))
      .orderBy(desc(mcProfile.updatedAt))
      .limit(1);

    if (!profile) {
      [profile] = await db
        .select({ skinUrl: mcProfile.skinUrl })
        .from(mcProfile)
        .where(sql`lower(${mcProfile.name}) = ${username.toLowerCase()}`)
        .orderBy(desc(mcProfile.updatedAt))
        .limit(1);
    }

    const match = profile?.skinUrl?.match(TEXTURE_URL_REGEX);
    return match?.[1] ?? null;
  } catch (error) {
    console.error("[minecraft/head] не удалось получить текстуру из БД:", error);
    return null;
  }
}

async function proxyImage(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "image/png,image/*;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(1_800),
      next: { revalidate: 300 },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) return null;

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { username } = await params;
  const player = username.trim();
  const size = Number(request.nextUrl.searchParams.get("size") ?? 64);

  const isUuid = UUID_REGEX.test(player);
  const isNickname = NICKNAME_REGEX.test(player);
  if (!isNickname && !isUuid) {
    return NextResponse.json(
      { error: "Некорректный ник или UUID игрока" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(size) || size < 1 || size > 512) {
    return NextResponse.json(
      { error: "Размер должен быть от 1 до 512" },
      { status: 400 },
    );
  }

  const textureId = isNickname ? await getStoredTextureId(player) : null;
  const encodedPlayer = encodeURIComponent(player);
  const sizeSuffix = `/${size}.png`;
  const candidates = [
    // A stored texture ID is most accurate for offline-mode/custom skins.
    ...(textureId
      ? [`https://mc-heads.net/avatar/${textureId}${sizeSuffix}`]
      : []),
    // Use independent renderers; MCHeads remains a fallback, not a single point of failure.
    `https://crafthead.net/avatar/${encodedPlayer}${sizeSuffix}`,
    `https://minotar.net/avatar/${encodedPlayer}${sizeSuffix}`,
    `https://mc-heads.net/avatar/${encodedPlayer}${sizeSuffix}`,
    `https://crafthead.net/avatar/MHF_Steve${sizeSuffix}`,
    `https://mc-heads.net/avatar/MHF_Steve${sizeSuffix}`,
  ];

  // The stored texture (offline/custom skins) gets priority. Avoid serial timeouts
  // across multiple external providers: try public fallbacks concurrently.
  if (textureId) {
    const storedTextureImage = await proxyImage(
      `https://mc-heads.net/avatar/${textureId}${sizeSuffix}`,
    );
    if (storedTextureImage) return storedTextureImage;
  }

  const fallbackUrls = [
    `https://crafthead.net/avatar/${encodedPlayer}${sizeSuffix}`,
    `https://minotar.net/avatar/${encodedPlayer}${sizeSuffix}`,
    `https://mc-heads.net/avatar/${encodedPlayer}${sizeSuffix}`,
  ];
  const fallbackResults = await Promise.all(fallbackUrls.map(proxyImage));
  const fallbackImage = fallbackResults.find((image) => image !== null);
  if (fallbackImage) return fallbackImage;

  const defaultImage = await proxyImage(
    `https://crafthead.net/avatar/MHF_Steve${sizeSuffix}`,
  );
  if (defaultImage) return defaultImage;

  const lastDefaultImage = await proxyImage(
    `https://mc-heads.net/avatar/MHF_Steve${sizeSuffix}`,
  );
  if (lastDefaultImage) return lastDefaultImage;

  return NextResponse.json(
    { error: "Не удалось загрузить голову игрока ни из одного источника" },
    { status: 502 },
  );
}
