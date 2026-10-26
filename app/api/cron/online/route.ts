import { bucketStart, fetchServerStatus, recordOnlineSample } from "@/lib/stats/online";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.ONLINE_CRON_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: "cron_not_configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await fetchServerStatus({ fresh: true });
  if (!status) {
    return Response.json(
      { error: "server_status_unavailable" },
      { status: 502 },
    );
  }

  try {
    await recordOnlineSample(status);
    return Response.json({
      ok: true,
      sampledAt: new Date().toISOString(),
      bucket: bucketStart().toISOString(),
      online: status.online,
      players: status.online ? status.players : 0,
    });
  } catch (error) {
    console.error("[cron/online] failed to store sample:", error);
    return Response.json({ error: "sample_write_failed" }, { status: 500 });
  }
}
