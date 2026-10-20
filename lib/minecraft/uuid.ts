const HEX32 = /^[0-9a-f]{32}$/;

/** Ник Minecraft (Java: 3-16 символов; Bedrock через Geyser может начинаться с точки) */
export const MC_NAME_RE = /^[A-Za-z0-9_.]{1,32}$/;

/** Приводит UUID к виду "32 hex-символа в нижнем регистре, без дефисов". null, если это не UUID. */
export function normalizeUuid(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/-/g, "");
  return HEX32.test(s) ? s : null;
}

/** 32 hex-символа -> UUID с дефисами (формат, который ждут команды Minecraft и DiscordSRV). */
export function formatUuid(uuid32: string): string {
  return `${uuid32.slice(0, 8)}-${uuid32.slice(8, 12)}-${uuid32.slice(12, 16)}-${uuid32.slice(16, 20)}-${uuid32.slice(20)}`;
}
