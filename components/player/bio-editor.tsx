"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Spinner } from "../ui/spinner";
import { PencilIcon } from "@phosphor-icons/react/dist/ssr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface Props {
  initialBio: string | null;
  initialShowDiscord: boolean;
  maxLength: number;
}

const TOOLS: {
  label: string;
  title: string;
  before: string;
  after?: string;
  block?: boolean;
  placeholder: string;
}[] = [
  {
    label: "B",
    title: "Жирный",
    before: "**",
    after: "**",
    placeholder: "жирный текст",
  },
  {
    label: "I",
    title: "Курсив",
    before: "*",
    after: "*",
    placeholder: "курсив",
  },
  {
    label: "H",
    title: "Заголовок",
    before: "## ",
    block: true,
    placeholder: "Заголовок",
  },
  {
    label: "•",
    title: "Список",
    before: "- ",
    block: true,
    placeholder: "пункт списка",
  },
  {
    label: "”",
    title: "Цитата",
    before: "> ",
    block: true,
    placeholder: "цитата",
  },
  { label: "</>", title: "Код", before: "`", after: "`", placeholder: "код" },
  {
    label: "🔗",
    title: "Ссылка",
    before: "[",
    after: "](https://)",
    placeholder: "текст ссылки",
  },
];

export function BioEditor({ initialBio, maxLength }: Props) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [saved, setSaved] = useState({
    bio: initialBio,
  });
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [draft, setDraft] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const length = Array.from(draft).length;
  const dirty = draft.trim() !== (saved.bio ?? "").trim();

  function startEditing() {
    setDraft(saved.bio ?? "");
    setTab("write");
    setError(null);
    setEditing(true);
  }

  function apply(tool: (typeof TOOLS)[number]) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end) || tool.placeholder;
    const lineStart = tool.block
      ? value.lastIndexOf("\n", start - 1) + 1
      : start;
    const before = tool.block
      ? value.slice(0, lineStart)
      : value.slice(0, start);
    const insert = tool.block
      ? `${tool.before}${value.slice(lineStart, end) || tool.placeholder}`
      : `${tool.before}${selected}${tool.after ?? ""}`;
    const next = before + insert + value.slice(end);
    setDraft(next);
    const cursorStart = tool.block
      ? lineStart + tool.before.length
      : start + tool.before.length;
    const cursorEnd = tool.block
      ? lineStart + insert.length
      : cursorStart + selected.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: draft }),
      });
      const data = (await res.json().catch(() => null)) as {
        bio?: string | null;
        showDiscord?: boolean;
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(
          data?.error?.message ?? "Не удалось сохранить. Попробуйте ещё раз.",
        );
        return;
      }
      setSaved({
        bio: data?.bio ?? null,
      });
      setEditing(false);
      router.refresh();
    } catch {
      setError(
        "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        {saved.bio ? (
          <Markdown>{saved.bio}</Markdown>
        ) : (
          <p className="text-muted-foreground">
            Вы пока ничего не рассказали о себе.
          </p>
        )}

        <Button variant="outline" className="mt-4" onClick={startEditing}>
          <PencilIcon weight="bold" />
          {saved.bio ? "Редактировать описание" : "Добавить описание"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) =>
        (e.ctrlKey || e.metaKey) && e.key === "Enter" && void save()
      }
    >
      <Tabs>
        <TabsList>
          {(["write", "preview"] as const).map((id) => (
            <TabsTrigger value={id} key={id}>
              {id === "write" ? "Редактор" : "Предпросмотр"}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="write"
          aria-label="Форматирование"
          className="flex flex-wrap gap-1"
        >
          {TOOLS.map((tool) => (
            <Button
              variant="secondary"
              size="icon"
              key={tool.title}
              title={tool.title}
              aria-label={tool.title}
              onClick={() => apply(tool)}
            >
              {tool.label}
            </Button>
          ))}

          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={9}
            maxLength={maxLength}
            aria-label="Описание профиля"
            placeholder="Расскажите о себе"
            className="max-h-70 min-h-40 mt-2"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 w-full text-xs text-muted-foreground">
            <span
              className={
                length > maxLength ? "font-semibold text-destructive" : ""
              }
            >
              {length} / {maxLength}
            </span>
            <span>Ctrl + Enter: сохранить</span>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="rounded-md bg-background/50 px-4 py-3">
            {draft.trim() ? (
              <Markdown>{draft}</Markdown>
            ) : (
              <p className="text-muted-foreground">Здесь появится описание.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void save()}
          disabled={saving || !dirty || length > maxLength}
        >
          {saving ? (
            <>
              <Spinner /> Сохраняю…
            </>
          ) : (
            "Сохранить"
          )}
        </Button>

        <Button
          onClick={() => setEditing(false)}
          variant="secondary"
          disabled={saving}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
