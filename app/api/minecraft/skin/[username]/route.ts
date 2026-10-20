import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { username } = await params;

  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
    return NextResponse.json(
      { error: "Некорректный ник Minecraft" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://mc-heads.net/skin/${encodeURIComponent(username)}`,
      {
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Не удалось загрузить скин" },
        { status: 404 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/png";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "API вернуло неожиданный формат" },
        { status: 502 },
      );
    }

    const image = await response.arrayBuffer();

    return new Response(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ошибка загрузки скина" },
      { status: 502 },
    );
  }
}
