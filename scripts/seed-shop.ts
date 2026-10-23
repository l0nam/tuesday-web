/**
 * Товары магазина Tuesday.
 *
 * npm run db:seed
 * Повторный запуск безопасен: обновляет описание, картинку, цену, режим выдачи,
 * команды и сортировку, но НЕ перезаписывает stock/enabled.
 *
 * ВАЖНО: товары донат-магазина пока идут на ручную выдачу.
 * Команды LuckPerms и выдачи ключей не подтверждены — не отправляем их плагину
 * до проверки реальных групп/команд сервера.
 */
import { loadEnvConfig } from "@next/env";
import { db } from "@/lib/db";
import { shopItem } from "@/lib/db/schema";

loadEnvConfig(process.cwd());

const items = [
  // Обычные игровые товары — автоматическая выдача.
  {
    slug: "diamonds-16",
    name: "Алмазы ×16",
    description: "Стопка алмазов прямо в инвентарь.",
    imageUrl: null,
    price: 50,
    stock: null,
    enabled: true,
    fulfillmentMode: "auto" as const,
    commands: ["give {player} minecraft:diamond 16"],
    sortOrder: 10,
  },
  {
    slug: "golden-apples-8",
    name: "Золотые яблоки ×8",
    description: "Пригодятся перед боем.",
    imageUrl: null,
    price: 30,
    stock: null,
    enabled: true,
    fulfillmentMode: "auto" as const,
    commands: ["give {player} minecraft:golden_apple 8"],
    sortOrder: 20,
  },
  {
    slug: "exp-bottles-64",
    name: "Пузырьки опыта ×64",
    description: "Для зачарования и ремонта снаряжения.",
    imageUrl: null,
    price: 60,
    stock: null,
    enabled: true,
    fulfillmentMode: "auto" as const,
    commands: ["give {player} minecraft:experience_bottle 64"],
    sortOrder: 30,
  },
  {
    slug: "netherite-ingot-2",
    name: "Незеритовые слитки ×2",
    description: "На улучшение снаряжения.",
    imageUrl: null,
    price: 250,
    stock: 20,
    enabled: true,
    fulfillmentMode: "auto" as const,
    commands: ["give {player} minecraft:netherite_ingot 2"],
    sortOrder: 40,
  },
  {
    slug: "elytra",
    name: "Элитры",
    description: "Лимитированный товар: ограниченное количество на сервере.",
    imageUrl: null,
    price: 400,
    stock: 5,
    enabled: true,
    fulfillmentMode: "auto" as const,
    commands: ["give {player} minecraft:elytra 1"],
    sortOrder: 50,
  },

  // Донат-магазин. Ручная выдача до подтверждения команд и групп на сервере.
  {
    slug: "plus-1-month",
    name: "PLUS — 1 месяц",
    description: "Привилегия PLUS на месяц. После покупки заявка появится в админке для выдачи.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/8941e2e6-ac23-42bc-a6b8-ab50ff5ce4d3.webp",
    price: 350,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 100,
  },
  {
    slug: "plus-3-months",
    name: "PLUS — 3 месяца",
    description: "Привилегия PLUS на три месяца. После покупки заявка появится в админке для выдачи.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/8941e2e6-ac23-42bc-a6b8-ab50ff5ce4d3.webp",
    price: 900,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 110,
  },
  {
    slug: "plus-1-year",
    name: "PLUS — 1 год",
    description: "Привилегия PLUS на год. После покупки заявка появится в админке для выдачи.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/8941e2e6-ac23-42bc-a6b8-ab50ff5ce4d3.webp",
    price: 2500,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 120,
  },
  {
    slug: "gold-1-month",
    name: "GOLD — 1 месяц",
    description: "Привилегия GOLD на месяц. После покупки заявка появится в админке для выдачи.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/fc1c2837-0ddb-4219-979e-a28d45a65d7d.webp",
    price: 800,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 130,
  },
  {
    slug: "gold-3-months",
    name: "GOLD — 3 месяца",
    description: "Привилегия GOLD на три месяца. После покупки заявка появится в админке для выдачи.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/fc1c2837-0ddb-4219-979e-a28d45a65d7d.webp",
    price: 2100,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 140,
  },
  {
    slug: "gold-1-year",
    name: "GOLD — 1 год",
    description: "Привилегия GOLD на год. После покупки заявка появится в админке для выдачи.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/fc1c2837-0ddb-4219-979e-a28d45a65d7d.webp",
    price: 6000,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 150,
  },
  {
    slug: "case-color-nickname",
    name: "Кейс «Цвет ника»",
    description: "Кейс с косметическими вариантами цвета ника. Ключ выдаётся вручную.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/52c02fbb-76a8-43a7-ad8f-967593f02e3e.webp",
    price: 100,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 160,
  },
  {
    slug: "case-animations",
    name: "Кейс «Анимации»",
    description: "Кейс с анимациями. Ключ выдаётся вручную.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/4e7f6e3d-bd01-4e0c-92a4-1e5fdff3668b.webp",
    price: 180,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 170,
  },
  {
    slug: "twink-account",
    name: "Твинк-аккаунт",
    description: "Дополнительный аккаунт для AFK на ферме. Оформление и выдача вручную через администрацию.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/4850bfa9-ece7-4dd9-a203-fbce37b0a770.webp",
    price: 1500,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 180,
  },
  {
    slug: "unban",
    name: "Разбан",
    description: "Заявка на разбан. Администрация проверит возможность разблокировки вручную.",
    imageUrl: "https://cdn.millida.trade/uploads/c6h6rq53eztjh3gmoylnzw8e/d3c2c3d4-f343-4c6c-9251-1126839f3368.webp",
    price: 2500,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 190,
  },
  {
    slug: "minecraft-license",
    name: "Лицензия Minecraft",
    description: "Заявка на получение лицензии Minecraft. Выдача и проверка выполняются администрацией вручную.",
    imageUrl: null,
    price: 5000,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 200,
  },
  {
    slug: "unique-item",
    name: "Уникальный предмет",
    description: "Индивидуальный предмет на выбор после согласования с администрацией. Выдаётся вручную.",
    imageUrl: null,
    price: 2000,
    stock: null,
    enabled: true,
    fulfillmentMode: "manual" as const,
    commands: [],
    sortOrder: 210,
  },
];

async function main() {
  for (const item of items) {
    await db
      .insert(shopItem)
      .values(item)
      .onDuplicateKeyUpdate({
        set: {
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          price: item.price,
          fulfillmentMode: item.fulfillmentMode,
          commands: item.commands,
          sortOrder: item.sortOrder,
        },
      });
  }

  console.log(`Готово: ${items.length} товаров в магазине.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
