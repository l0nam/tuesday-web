import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcProfile } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

const NICKNAME_REGEX = /^[a-zA-Z0-9_]{1,16}$/;
const TEXTURE_URL_REGEX =
  /^https:\/\/textures\.minecraft\.net\/texture\/([a-f0-9]{32,128})$/i;
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

async function getStoredSkinUrl(username: string): Promise<string | null> {
  try {
    const [profile] = await db
      .select({ skinUrl: mcProfile.skinUrl })
      .from(mcProfile)
      .where(eq(mcProfile.name, username))
      .orderBy(desc(mcProfile.updatedAt))
      .limit(1);

    const skinUrl = profile?.skinUrl ?? null;
    return skinUrl && TEXTURE_URL_REGEX.test(skinUrl) ? skinUrl : null;
  } catch (error) {
    console.error("[minecraft/skin] не удалось получить текстуру из БД:", error);
    return null;
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { username } = await params;

  if (!NICKNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: "Некорректный ник Minecraft" },
      { status: 400 },
    );
  }

  const storedSkin = await getStoredSkinUrl(username);
  const candidates = [
    ...(storedSkin ? [storedSkin] : []),
    "https://mc-heads.net/skin/" + encodeURIComponent(username),
    "https://mc-heads.net/skin/MHF_Steve",
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
      // Try the next source. The last candidate is the default Steve skin.
    }
  }

  return NextResponse.json(
    { error: "Не удалось загрузить текстуру скина" },
    { status: 502 },
  );
}
