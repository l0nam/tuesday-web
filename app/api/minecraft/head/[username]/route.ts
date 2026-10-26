import { eq, desc } from "drizzle-orm";
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
    const [profile] = await db
      .select({ skinUrl: mcProfile.skinUrl })
      .from(mcProfile)
      .where(eq(mcProfile.name, username))
      .orderBy(desc(mcProfile.updatedAt))
      .limit(1);

    const match = profile?.skinUrl?.match(TEXTURE_URL_REGEX);
    return match?.[1] ?? null;
  } catch (error) {
    console.error("[minecraft/head] не удалось получить текстуру из БД:", error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { username } = await params;
  const player = username.trim();
  const size = Number(request.nextUrl.searchParams.get("size") ?? 64);

  if (!NICKNAME_REGEX.test(player) && !UUID_REGEX.test(player)) {
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

  const textureId = NICKNAME_REGEX.test(player)
    ? await getStoredTextureId(player)
    : null;
  const candidates = [
    ...(textureId ? ["https://mc-heads.net/avatar/" + textureId + "/" + size + ".png"] : []),
    "https://mc-heads.net/avatar/" + encodeURIComponent(player) + "/" + size + ".png",
    "https://mc-heads.net/avatar/MHF_Steve/" + size + ".png",
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "image/png" },
        next: { revalidate: 300 },
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) continue;

      return new Response(await response.arrayBuffer(), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": CACHE_CONTROL,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // Try the next source.
    }
  }

  return NextResponse.json(
    { error: "Не удалось загрузить голову игрока" },
    { status: 502 },
  );
}
