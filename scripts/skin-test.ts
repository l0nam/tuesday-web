/**
 * Проверка загрузки скинов (lib/skin.ts) на локальных мок-серверах: без БД и без доступа в интернет.
 *   npm run test:skin
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  defaultSkinPng,
  getSkin,
  isAllowedTextureUrl,
  isValidSkinPng,
  parseSkinUrl,
  pngDimensions,
} from "@/lib/minecraft/skin";

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(
      `  ✗ ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`,
    );
  }
}
const group = (t: string) => console.log(`\n${t}`);

const U = (n: number) => `b${String(n).padStart(31, "0")}`;
const ids = {
  ok: U(1),
  evil: U(2),
  none: U(3),
  notFound: U(4),
  limited: U(5),
  noSkin: U(6),
  big: U(7),
  notPng: U(8),
  badDim: U(9),
  redirect: U(10),
  slow: U(11),
  race: U(12),
  error: U(13),
  slim: U(14),
};

const sessionHits: string[] = [];
let evilHits = 0;
let textureHits = 0;

function profileBody(textureUrl: string, slim = false) {
  const textures = {
    textures: {
      SKIN: {
        url: textureUrl,
        ...(slim ? { metadata: { model: "slim" } } : {}),
      },
    },
  };
  return {
    id: "x",
    name: "x",
    properties: [
      {
        name: "textures",
        value: Buffer.from(JSON.stringify(textures)).toString("base64"),
      },
    ],
  };
}

async function main() {
  // «Злой» сервер: сюда ни при каких условиях не должны ходить
  const evil = createServer((_req, res) => {
    evilHits += 1;
    res.writeHead(200).end("secret");
  });
  await new Promise<void>((r) => evil.listen(0, "127.0.0.1", r));
  const evilOrigin = `http://127.0.0.1:${(evil.address() as AddressInfo).port}`;

  const mock = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    const json = (status: number, body?: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    const m = url.match(/^\/session\/minecraft\/profile\/([0-9a-f]{32})$/);
    if (m) {
      sessionHits.push(m[1]);
      const origin = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
      switch (m[1]) {
        case ids.ok:
          return json(200, profileBody(`${origin}/texture/ok`));
        case ids.slim:
          return json(200, profileBody(`${origin}/texture/ok`, true));
        case ids.evil:
          return json(200, profileBody(`${evilOrigin}/steal`));
        case ids.none:
          return json(204);
        case ids.notFound:
          return json(404, { error: "NotFound" });
        case ids.limited:
          return json(429, { error: "TooManyRequests" });
        case ids.noSkin:
          return json(200, { id: m[1], name: "x", properties: [] });
        case ids.big:
          return json(200, profileBody(`${origin}/texture/big`));
        case ids.notPng:
          return json(200, profileBody(`${origin}/texture/notpng`));
        case ids.badDim:
          return json(200, profileBody(`${origin}/texture/baddim`));
        case ids.redirect:
          return json(200, profileBody(`${origin}/texture/redirect`));
        case ids.slow:
          return setTimeout(
            () => json(200, profileBody(`${origin}/texture/ok`)),
            6_000,
          ).unref();
        case ids.race:
          return setTimeout(
            () => json(200, profileBody(`${origin}/texture/ok`)),
            150,
          );
        case ids.error:
          return json(500, {});
        default:
          return json(404, {});
      }
    }
    if (url.startsWith("/texture/")) {
      textureHits += 1;
      const png = defaultSkinPng();
      if (url === "/texture/ok")
        return void res
          .writeHead(200, { "content-type": "image/png" })
          .end(png);
      if (url === "/texture/big")
        return void res
          .writeHead(200, { "content-type": "image/png" })
          .end(Buffer.concat([png, Buffer.alloc(200 * 1024)]));
      if (url === "/texture/notpng")
        return void res.writeHead(200).end("<html>hello</html>");
      if (url === "/texture/baddim") {
        const copy = Buffer.from(png);
        copy.writeUInt32BE(128, 16); // ширина 128
        return void res.writeHead(200).end(copy);
      }
      if (url === "/texture/redirect")
        return void res
          .writeHead(302, { location: `${evilOrigin}/steal` })
          .end();
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => mock.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
  const opts = { sessionBase: origin, allowedOrigins: [origin] };

  try {
    group("Запасной скин");
    await test("это корректный PNG 64×64, проходящий проверку", () => {
      const png = defaultSkinPng();
      assert.deepEqual(pngDimensions(png), { width: 64, height: 64 });
      assert.equal(isValidSkinPng(png), true);
    });
    await test("независимый декодер (Pillow) читает его и видит ожидаемые пиксели", async () => {
      const file =
        "/tmp/claude-0/-home-claude/7f6797dc-d2f1-5b26-90ad-a9571e0a4fc2/scratchpad/default-skin.png";
      writeFileSync(file, defaultSkinPng());
      const { execFileSync } = await import("node:child_process");
      const out = execFileSync("python3", [
        "-c",
        `
from PIL import Image
im = Image.open("${file}").convert("RGBA")
print(im.size, im.getpixel((9,11)), im.getpixel((20,20)), im.getpixel((63,63)), im.getpixel((44,20)))
`,
      ])
        .toString()
        .trim();
      assert.equal(
        out,
        "(64, 64) (245, 245, 245, 255) (38, 150, 88, 255) (0, 0, 0, 0) (38, 150, 88, 255)",
      );
    });
    await test("проверка размеров: 64×64 и 64×32 можно, остальное нельзя", () => {
      const base = Buffer.from(defaultSkinPng());
      const withSize = (w: number, h: number) => {
        const c = Buffer.from(base);
        c.writeUInt32BE(w, 16);
        c.writeUInt32BE(h, 20);
        return c;
      };
      assert.equal(isValidSkinPng(withSize(64, 32)), true);
      assert.equal(isValidSkinPng(withSize(64, 64)), true);
      assert.equal(isValidSkinPng(withSize(128, 128)), false);
      assert.equal(isValidSkinPng(withSize(10000, 10000)), false);
      assert.equal(
        isValidSkinPng(
          Buffer.from("GIF89a...................................."),
        ),
        false,
      );
      assert.equal(isValidSkinPng(Buffer.alloc(0)), false);
    });

    group("Разбор ответа Mojang и проверка адреса");
    await test("parseSkinUrl: обычная и slim-модель, мусор и отсутствие текстур", () => {
      const classic = parseSkinUrl(
        profileBody("https://textures.minecraft.net/texture/abc"),
      );
      assert.deepEqual(classic, {
        url: "https://textures.minecraft.net/texture/abc",
        slim: false,
      });
      assert.equal(
        parseSkinUrl(
          profileBody("https://textures.minecraft.net/texture/abc", true),
        )?.slim,
        true,
      );
      assert.equal(parseSkinUrl({ properties: [] }), null);
      assert.equal(
        parseSkinUrl({
          properties: [{ name: "textures", value: "%%%не base64%%%" }],
        }),
        null,
      );
      assert.equal(
        parseSkinUrl({
          properties: [
            { name: "textures", value: Buffer.from("{}").toString("base64") },
          ],
        }),
        null,
      );
      assert.equal(parseSkinUrl("строка"), null);
      assert.equal(parseSkinUrl(null), null);
    });
    await test("адрес текстуры: только https://textures.minecraft.net", () => {
      assert.equal(
        isAllowedTextureUrl("https://textures.minecraft.net/texture/abc"),
        true,
      );
      assert.equal(
        isAllowedTextureUrl("https://TEXTURES.minecraft.net/texture/abc"),
        true,
      );
      for (const bad of [
        "http://textures.minecraft.net/texture/abc",
        "https://textures.minecraft.net.evil.com/texture/abc",
        "https://evil.com/?u=https://textures.minecraft.net/x",
        "https://user:pw@textures.minecraft.net/x",
        "https://textures.minecraft.net:8443/x",
        "https://169.254.169.254/latest/meta-data",
        "http://localhost/x",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "не адрес",
        "",
      ]) {
        assert.equal(isAllowedTextureUrl(bad), false, bad);
      }
    });

    group("Загрузка через мок Mojang");
    await test("нормальный скин: источник mojang, кэш на час", async () => {
      const r = await getSkin(ids.ok, opts);
      assert.equal(r.source, "mojang");
      assert.equal(r.ttl, 3600);
      assert.equal(isValidSkinPng(r.png), true);
    });
    await test("повторный запрос берётся из кэша (в «Mojang» не ходим)", async () => {
      const before = sessionHits.length;
      const r = await getSkin(ids.ok, opts);
      assert.equal(r.source, "mojang");
      assert.equal(sessionHits.length, before);
    });
    await test("slim-скин тоже загружается", async () => {
      assert.equal((await getSkin(ids.slim, opts)).source, "mojang");
    });
    await test("нет профиля (204/404) или нет скина: запасной скин, кэш 10 минут", async () => {
      for (const id of [ids.none, ids.notFound, ids.noSkin]) {
        const r = await getSkin(id, opts);
        assert.equal(r.source, "default", id);
        assert.equal(r.ttl, 600);
      }
    });
    await test("429, 500: запасной скин, короткий кэш (минута)", async () => {
      for (const id of [ids.limited, ids.error]) {
        const r = await getSkin(id, opts);
        assert.equal(r.source, "default", id);
        assert.equal(r.ttl, 60);
      }
    });
    await test("SSRF: адрес текстуры на чужом сервере не запрашивается", async () => {
      const r = await getSkin(ids.evil, opts);
      assert.equal(r.source, "default");
      assert.equal(evilHits, 0);
    });
    await test("SSRF: редирект с текстуры на чужой сервер не выполняется", async () => {
      const r = await getSkin(ids.redirect, opts);
      assert.equal(r.source, "default");
      assert.equal(evilHits, 0);
    });
    await test("слишком большой файл, не PNG и неверные размеры отклоняются", async () => {
      for (const id of [ids.big, ids.notPng, ids.badDim]) {
        const r = await getSkin(id, opts);
        assert.equal(r.source, "default", id);
      }
    });
    await test("10 одновременных запросов одного скина = один поход в Mojang", async () => {
      const before = sessionHits.filter((h) => h === ids.race).length;
      const results = await Promise.all(
        Array.from({ length: 10 }, () => getSkin(ids.race, opts)),
      );
      assert.ok(results.every((r) => r.source === "mojang"));
      assert.equal(
        sessionHits.filter((h) => h === ids.race).length - before,
        1,
      );
    });
    await test("зависший Mojang: через ~3 с отдаём запасной скин, не висим", async () => {
      const t = Date.now();
      const r = await getSkin(ids.slow, opts);
      const took = Date.now() - t;
      assert.equal(r.source, "default");
      assert.ok(took >= 2_500 && took < 5_000, `заняло ${took} мс`);
    });
    await test("недоступный сервер (соединение отклонено): запасной скин", async () => {
      const r = await getSkin(U(99), {
        sessionBase: "http://127.0.0.1:1",
        allowedOrigins: [origin],
      });
      assert.equal(r.source, "default");
      assert.equal(r.ttl, 60);
    });
    await test("ни одна проверка не дошла до чужого сервера", () =>
      assert.equal(evilHits, 0));
    void textureHits;
  } finally {
    mock.close();
    evil.close();
    mock.closeAllConnections?.();
  }

  console.log(`\nИтого: ${passed} успешно, ${failed} с ошибками`);
  process.exit(failed === 0 ? 0 : 1);
}
main();
