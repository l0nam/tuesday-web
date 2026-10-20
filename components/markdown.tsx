import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Описание профиля с Markdown-форматированием (заголовки, жирный/курсив, списки, цитаты, код, таблицы,
 * ссылки, списки задач). Это не настоящий MDX: MDX выполняет JavaScript, а текст пишут посторонние люди,
 * поэтому здесь безопасный Markdown:
 *  - HTML в тексте не выполняется и не отрисовывается как разметка (виден как обычный текст);
 *  - ссылки только http, https и mailto, открываются в новой вкладке с rel="nofollow ugc noopener";
 *  - картинки не отображаются (иначе по ним можно отслеживать посетителей и вставлять чужой контент),
 *    вместо них остаётся подпись.
 */

const ALLOWED_LINK = /^(https?:|mailto:)/i;

function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("/"))
    return trimmed.startsWith("//") ? "" : trimmed;
  return ALLOWED_LINK.test(trimmed) ? trimmed : "";
}

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-4 mb-2 text-xl font-bold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-4 mb-2 text-lg font-bold first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-base font-semibold first:mt-0">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-base font-semibold first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  h6: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),

  a: ({ href, children }) => {
    const url = href ? safeUrl(href) : "";
    if (!url) return <span>{children}</span>;
    const external = /^https?:/i.test(url);
    return (
      <Link
        href={url}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" }
          : {})}
        className="text-primary underline underline-offset-4 hover:opacity-80"
      >
        {children}
      </Link>
    );
  },
  ul: ({ children, className }) => (
    <ul
      className={`my-2 space-y-1 ${className?.includes("contains-task-list") ? "list-none" : "list-disc pl-5"}`}
    >
      {children}
    </ul>
  ),

  img: ({ alt }) =>
    alt ? <span className="text-muted-foreground">{alt}</span> : null,
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed marker:text-primary">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 rounded-md border-primary outline-1 outline-border bg-muted/60 py-1.5 pr-3 pl-4">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 " />,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="opacity-70">{children}</del>,
  code: ({ children, className }) =>
    className?.startsWith("language-") ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-foreground/10 px-2 py-1 font-mono">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md border bg-muted/60 p-3 font-mono text-sm">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border ">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b  bg-muted/50 px-3 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b  px-3 py-2 last:border-r-0">
      {children}
    </td>
  ),
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled
      readOnly
      className="mr-2 accent-primary"
    />
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}): ReactNode {
  return (
    <div className={`wrap-break-word ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={safeUrl}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
