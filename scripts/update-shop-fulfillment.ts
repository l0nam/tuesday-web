import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shopItem } from "@/lib/db/schema";

loadEnvConfig(process.cwd());

const items = [
  {
    slug: "plus-1-month",
    description: "Привилегия PLUS на месяц. Выдаётся автоматически после покупки.",
    command: "lp user {player} parent addtemp plus 30d",
  },
  {
    slug: "plus-3-months",
    description: "Привилегия PLUS на три месяца. Выдаётся автоматически после покупки.",
    command: "lp user {player} parent addtemp plus 90d",
  },
  {
    slug: "plus-1-year",
    description: "Привилегия PLUS на год. Выдаётся автоматически после покупки.",
    command: "lp user {player} parent addtemp plus 365d",
  },
  {
    slug: "gold-1-month",
    description: "Привилегия GOLD на месяц. Выдаётся автоматически после покупки.",
    command: "lp user {player} parent addtemp gold 30d",
  },
  {
    slug: "gold-3-months",
    description: "Привилегия GOLD на три месяца. Выдаётся автоматически после покупки.",
    command: "lp user {player} parent addtemp gold 90d",
  },
  {
    slug: "gold-1-year",
    description: "Привилегия GOLD на год. Выдаётся автоматически после покупки.",
    command: "lp user {player} parent addtemp gold 365d",
  },
  {
    slug: "case-color-nickname",
    description: "Кейс с косметическими вариантами цвета ника. Выдаётся автоматически после покупки.",
    command: "cases give {player} colors 1",
  },
  {
    slug: "case-animations",
    description: "Кейс с анимациями. Выдаётся автоматически после покупки.",
    command: "cases give {player} animations 1",
  },
  {
    slug: "twink-account",
    description: "Дополнительный аккаунт для AFK на ферме. После покупки игрок добавляется в whitelist сервера.",
    command: "whitelist add {player}",
  },
  {
    slug: "unban",
    description: "После покупки команда разблокировки отправляется автоматически.",
    command: "unban {player}",
  },
] as const;

async function main() {
  const missing: string[] = [];

  for (const item of items) {
    const [existing] = await db
      .select({ id: shopItem.id })
      .from(shopItem)
      .where(eq(shopItem.slug, item.slug))
      .limit(1);

    if (!existing) {
      missing.push(item.slug);
      continue;
    }

    await db
      .update(shopItem)
      .set({
        description: item.description,
        commands: [item.command],
        fulfillmentMode: "auto",
      })
      .where(eq(shopItem.slug, item.slug));
  }

  if (missing.length > 0) {
    throw new Error(`В базе не найдены товары: ${missing.join(", ")}. Сначала заполни магазин.`);
  }

  console.log(`Настроена автоматическая выдача для ${items.length} товаров. Цены не менялись.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
