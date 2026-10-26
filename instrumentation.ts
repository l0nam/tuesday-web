export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Vercel Functions are short-lived. Production samples come from signed
  // server_status events sent by the running Minecraft plugin.
  if (process.env.VERCEL === "1") return;

  const { startOnlineSampler } = await import("@/lib/stats/online");
  startOnlineSampler();
}
