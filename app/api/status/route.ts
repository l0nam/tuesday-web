export async function GET() {
  try {
    const response = await fetch(
      "https://api.mcsrvstat.us/3/tuesday-prime.ru",
      {
        headers: {
          "User-Agent": "Tuesday-Website/1.0 (tuesday-prime.ru)",
          Accept: "application/json",
        },
        next: {
          revalidate: 300,
        },
      },
    );

    const text = await response.text();

    if (!response.ok) {
      console.error("MCSrvStat error:", response.status, text);

      return Response.json(
        {
          error: "Ошибка MCSrvStat",
          upstreamStatus: response.status,
          details: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    return Response.json(JSON.parse(text));
  } catch (error) {
    console.error("Tuesday API error:", error);

    return Response.json(
      {
        error: "Ошибка запроса",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
