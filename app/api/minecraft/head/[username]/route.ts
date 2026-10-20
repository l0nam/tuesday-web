import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const UUID_REGEX =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const NICKNAME_REGEX = /^[a-zA-Z0-9_]{1,16}$/;

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { username } = await params;
  const player = username.trim();
  const size = Number(request.nextUrl.searchParams.get("size") ?? 64);

  if (
    !NICKNAME_REGEX.test(player) &&
    !UUID_REGEX.test(player)
  ) {
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

  try {
    const response = await fetch(
      `https://mc-heads.net/avatar/${encodeURIComponent(player)}/${size}`,
      {
        headers: { Accept: "image/png" },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Не удалось загрузить голову игрока" },
        { status: 404 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "API вернуло неожиданный формат" },
        { status: 502 },
      );
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ошибка загрузки головы игрока" },
      { status: 502 },
    );
  }
}