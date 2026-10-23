/**
 * Безопасность и возможности Markdown в описании профиля: npm run test:markdown
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/markdown";
import { normalizeBio } from "@/lib/profile/bio";

const render = (md: string) =>
  renderToStaticMarkup(createElement(Markdown, null, md));
/** То же без внешней обёртки-div (чтобы искать в результате только то, что породил текст пользователя) */
const renderInner = (md: string) =>
  render(md)
    .replace(/^<div class="break-words ">/, "")
    .replace(/<\/div>$/, "");

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
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

group("Форматирование");
test("жирный, курсив, зачёркнутый, код", () => {
  const html = render("**жирный** *курсив* ~~зачёркнутый~~ `код`");
  assert.match(html, /<strong[^>]*>жирный<\/strong>/);
  assert.match(html, /<em[^>]*>курсив<\/em>/);
  assert.match(html, /<del[^>]*>зачёркнутый<\/del>/);
  assert.match(html, /<code[^>]*>код<\/code>/);
});
test("заголовки сдвинуты вниз: на странице h1 один, это ник", () => {
  const html = render("# А\n## Б\n### В");
  assert.doesNotMatch(html, /<h1|<h2/);
  assert.match(html, /<h3[^>]*>А<\/h3>/);
  assert.match(html, /<h4[^>]*>В<\/h4>/);
});
test("списки, цитата, таблица, блок кода, список задач", () => {
  const html = render(
    "- а\n- б\n\n1. раз\n2. два\n\n> цитата\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n```js\nconst a = 1;\n```\n\n- [x] готово\n- [ ] нет",
  );
  assert.match(html, /<ul[^>]*>[\s\S]*<li[^>]*>а<\/li>/);
  assert.match(html, /<ol[^>]*>[\s\S]*<li[^>]*>раз<\/li>/);
  assert.match(html, /<blockquote[^>]*>[\s\S]*цитата/);
  assert.match(
    html,
    /<table[^>]*>[\s\S]*<th[^>]*>x<\/th>[\s\S]*<td[^>]*>2<\/td>/,
  );
  assert.match(html, /<pre[^>]*><code class="language-js">const a = 1;/);
  assert.match(html, /<input[^>]*type="checkbox"[^>]*checked/);
  assert.match(
    html,
    /<input[^>]*disabled/,
    "флажки в списке задач нельзя переключать",
  );
});
test("обычные ссылки: новая вкладка и rel=nofollow ugc noopener", () => {
  for (const md of [
    "[сайт](https://example.com/path?a=1)",
    "https://example.com/auto",
  ]) {
    const html = render(md);
    assert.match(html, /<a [^>]*href="https:\/\/example\.com[^"]*"/, md);
    assert.match(html, /target="_blank"/, md);
    assert.match(html, /rel="noopener noreferrer nofollow ugc"/, md);
  }
});
test("внутренние и почтовые ссылки допустимы", () => {
  assert.match(render("[города](/cities)"), /<a [^>]*href="\/cities"/);
  assert.match(render("[якорь](#top)"), /<a [^>]*href="#top"/);
  assert.match(
    render("[почта](mailto:a@b.co)"),
    /<a [^>]*href="mailto:a@b\.co"/,
  );
});

group("Безопасность");
test("сырой HTML не становится разметкой (скрипты, картинки, обработчики, ссылки)", () => {
  for (const attack of [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    '<a href="javascript:alert(1)">x</a>',
    "<iframe src='https://evil.example'></iframe>",
    '<div onclick="alert(1)">x</div>',
    "<svg onload=alert(1)>",
    "<style>body{display:none}</style>",
  ]) {
    const html = renderInner(attack);
    assert.doesNotMatch(
      html,
      /<(script|img|iframe|svg|style|div|a)[\s>]/i,
      `${attack} -> ${html}`,
    );
  }
});
test("опасные схемы ссылок не попадают в href", () => {
  for (const url of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "&#106;avascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "//evil.example/x",
    "file:///etc/passwd",
    "<javascript:alert(1)>",
  ]) {
    const html = render(`[клик](${url})`);
    assert.doesNotMatch(html, /href=/i, `${url} -> ${html}`);
    assert.match(html, /клик/, "текст ссылки остаётся");
  }
});
test("картинки отключены: тег не создаётся, остаётся подпись", () => {
  const html = render("![подпись](https://evil.example/track.png)");
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /подпись/);
});
test("пользовательский текст экранируется", () => {
  const html = render('"><b>x</b> & <');
  assert.doesNotMatch(html, /<b>/);
});

group("Очистка перед сохранением");
test("перевод строк, пробелы в конце, лишние пустые строки", () => {
  const r = normalizeBio("  привет  \r\n\r\n\r\n\r\n\r\nмир\r  ");
  assert.deepEqual(r, { ok: true, value: "привет\n\n\nмир" });
});
test("управляющие и «разворачивающие» символы удаляются, эмодзи остаются", () => {
  const r = normalizeBio("a\u0000b‮c⁦d‍👨‍👩‍👧");
  assert.deepEqual(r, { ok: true, value: "abcd‍👨‍👩‍👧" });
});
test("пустое описание = null (очистка)", () => {
  assert.deepEqual(normalizeBio("   \n\n  "), { ok: true, value: null });
  assert.deepEqual(normalizeBio(""), { ok: true, value: null });
});
test("лимит длины считается в символах, а не в байтах", () => {
  assert.equal(normalizeBio("я".repeat(2000)).ok, true);
  assert.equal(normalizeBio("я".repeat(2001)).ok, false);
  assert.equal(
    normalizeBio("😀".repeat(2000)).ok,
    true,
    "эмодзи это один символ",
  );
});
test("слишком много строк", () => {
  assert.equal(
    normalizeBio(Array.from({ length: 101 }, (_, i) => `${i}`).join("\n")).ok,
    false,
  );
  assert.equal(
    normalizeBio(Array.from({ length: 100 }, (_, i) => `${i}`).join("\n")).ok,
    true,
  );
});

console.log(`\nИтого: ${passed} успешно, ${failed} с ошибками`);
process.exit(failed === 0 ? 0 : 1);
