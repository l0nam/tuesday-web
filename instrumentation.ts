export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startOnlineSampler } = await import("@/lib/stats/online");
  startOnlineSampler();
}
