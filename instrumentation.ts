export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Vercel Functions are short-lived; setInterval is not a dependable scheduler there.
  // Production samples are written by the secured /api/cron/online endpoint instead.
  if (process.env.VERCEL === "1") return;

  const { startOnlineSampler } = await import("@/lib/stats/online");
  startOnlineSampler();
}
