"use client";

import { Dispatch, SetStateAction, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ClipboardTextIcon,
  CopyIcon,
  FlagBannerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BannerView } from "@/components/cities/banner";
import {
  BANNER_MAX_LAYERS,
  BANNER_PATTERNS,
  DEFAULT_BANNER,
  DYE_COLORS,
  parseBannerInput,
  patternInfo,
  serializeBanner,
  toGiveCommand,
  type Banner,
  type BannerLayer,
  type DyeColor,
  type PatternId,
} from "@/lib/cities/banner";
import { Label } from "../ui/label";

function Palette({
  value,
  onPick,
  label,
}: {
  value: DyeColor;
  onPick: (color: DyeColor) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-8 gap-1.5">
      {DYE_COLORS.map((c) => (
        <Button
          key={c.id}
          title={c.label}
          aria-label={c.label}
          aria-pressed={value === c.id}
          onClick={() => onPick(c.id)}
          style={{ backgroundColor: c.hex }}
          size="lg"
          className={cn(
            "grid aspect-square place-items-center w-full ring-1 ring-foreground/20 transition",
            value === c.id &&
              "ring-2 ring-primary ring-offset-2 ring-offset-card",
          )}
        >
          {value === c.id && (
            <CheckIcon
              weight="bold"
              className={cn(
                "size-3.5",
                c.id === "white" || c.id === "yellow" || c.id === "lime"
                  ? "text-black"
                  : "text-white",
              )}
            />
          )}
        </Button>
      ))}
    </div>
  );
}

const PREVIEW_BASE: DyeColor = "gray";

function EditorBody({
  banner,
  setBanner,
}: {
  banner: Banner;
  setBanner: Dispatch<SetStateAction<Banner>>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [paint, setPaint] = useState<DyeColor>(
    banner.layers.at(-1)?.color ?? "white",
  );
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "give" | null>(null);

  const code = serializeBanner(banner);
  const full = banner.layers.length >= BANNER_MAX_LAYERS;
  const activeColor =
    selected !== null ? (banner.layers[selected]?.color ?? paint) : paint;

  function addLayer(pattern: PatternId) {
    if (full) return;
    setBanner((b) => ({
      ...b,
      layers: [...b.layers, { pattern, color: paint }],
    }));
    setSelected(banner.layers.length);
  }

  function pickColor(color: DyeColor) {
    setPaint(color);
    if (selected !== null) {
      setBanner((b) => ({
        ...b,
        layers: b.layers.map((l, i) => (i === selected ? { ...l, color } : l)),
      }));
    }
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= banner.layers.length) return;
    setBanner((b) => {
      const layers = [...b.layers];
      [layers[index], layers[target]] = [layers[target], layers[index]];
      return { ...b, layers };
    });
    setSelected(target);
  }

  function remove(index: number) {
    setBanner((b) => ({
      ...b,
      layers: b.layers.filter((_, i) => i !== index),
    }));
    setSelected(null);
  }

  function importCode() {
    const parsed = parseBannerInput(importText);
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }
    setBanner(parsed.banner);
    setSelected(null);
    setImportText("");
    setImportError(null);
  }

  async function copy(kind: "code" | "give", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setImportError(
        "Не удалось скопировать автоматически: выделите код вручную",
      );
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]">
      <div className="space-y-4 md:sticky md:top-0 md:self-start">
        <div className="grid place-items-center rounded-lg bg-background/60 p-5 ring-1 ring-foreground/10">
          <BannerView banner={banner} className="w-28" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner-code">Код флага</Label>

          <Input
            id="banner-code"
            readOnly
            value={code}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono"
          />

          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void copy("code", code)}
            >
              {copied === "code" ? (
                <CheckIcon weight="bold" />
              ) : (
                <CopyIcon weight="bold" />
              )}
              {copied === "code" ? "Скопировано" : "Код"}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => void copy("give", toGiveCommand(banner))}
              title="Команда для выдачи этого баннера в игре (1.20.5+)"
            >
              {copied === "give" ? (
                <CheckIcon weight="bold" />
              ) : (
                <ClipboardTextIcon weight="bold" />
              )}
              {copied === "give" ? "Скопировано" : "/give"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner-import">Код или команда</Label>

          <div className="flex items-center gap-2">
            <Input
              id="banner-import"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && importText.trim() && importCode()
              }
              placeholder="white|bs:red|cr:black"
              className="font-mono text-xs"
              aria-invalid={Boolean(importError)}
            />

            <Button
              size="sm"
              className="h-10"
              variant="secondary"
              disabled={!importText.trim()}
              onClick={importCode}
            >
              OK
            </Button>
          </div>

          {importError && (
            <p role="alert" className="text-xs text-destructive">
              {importError}
            </p>
          )}
        </div>
      </div>

      {/* Настройка */}
      <div className="min-w-0 space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Цвет фона</h3>
          <Palette
            label="Цвет фона"
            value={banner.base}
            onPick={(base) => setBanner((b) => ({ ...b, base }))}
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Слои{" "}
              <span className="font-normal text-muted-foreground">
                {banner.layers.length} / {BANNER_MAX_LAYERS}
              </span>
            </h3>

            {banner.layers.length > 0 && (
              <Button
                onClick={() => {
                  setBanner((b) => ({ ...b, layers: [] }));
                  setSelected(null);
                }}
                size="sm"
                variant="ghost"
                className="text-muted-foreground transition hover:text-destructive"
              >
                Очистить
              </Button>
            )}
          </div>

          {banner.layers.length === 0 ? (
            <p className="rounded-md border p-3 text-sm text-muted-foreground">
              Слоёв пока нет. Выберите цвет и нажмите на узор ниже, он ляжет
              поверх фона.
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {banner.layers.map((layer: BannerLayer, index) => (
                <li key={index}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 transition",
                      selected === index
                        ? "border-primary/60 bg-primary/10"
                        : "border-transparent bg-muted/40 hover:bg-muted",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(selected === index ? null : index);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 p-1.5 text-left"
                      aria-pressed={selected === index}
                    >
                      <BannerView
                        banner={{
                          base: PREVIEW_BASE,
                          layers: [{ pattern: layer.pattern, color: "white" }],
                        }}
                        className="w-5"
                      />

                      <span className="min-w-0 flex-1 truncate text-sm">
                        {patternInfo(layer.pattern).label}
                      </span>

                      <span
                        className="size-5 shrink-0 rounded border"
                        style={{
                          backgroundColor: DYE_COLORS.find(
                            (c) => c.id === layer.color,
                          )?.hex,
                        }}
                        title={
                          DYE_COLORS.find((c) => c.id === layer.color)?.label
                        }
                      />
                    </button>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Поднять слой выше"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon weight="bold" />
                    </Button>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Опустить слой ниже"
                      disabled={index === banner.layers.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon weight="bold" />
                    </Button>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Удалить слой"
                      onClick={() => remove(index)}
                    >
                      <TrashIcon weight="bold" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            {selected !== null ? "Цвет выбранного слоя" : "Цвет нового слоя"}
          </h3>
          <Palette label="Цвет слоя" value={activeColor} onPick={pickColor} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Узоры</h3>
          <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1.5 overflow-y-auto pr-1">
            {BANNER_PATTERNS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                disabled={full}
                onClick={() => addLayer(p.id)}
                className="flex flex-col items-center gap-1.5 rounded-md bg-muted/40 px-1 py-2 transition hover:bg-muted hover:ring-1 hover:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BannerView
                  banner={{
                    base: PREVIEW_BASE,
                    layers: [{ pattern: p.id, color: "white" }],
                  }}
                  className="w-5"
                  label=""
                />
                <span className="line-clamp-2 w-full text-center text-[10px] leading-tight wrap-break-word text-muted-foreground">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
          {full && (
            <p className="text-xs text-muted-foreground">
              Достигнут максимум слоёв.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export function BannerEditorDialog({
  open,
  onOpenChange,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Banner | null;
  onApply: (banner: Banner) => void;
}) {
  const [banner, setBanner] = useState<Banner>(value ?? DEFAULT_BANNER);

  function handleOpenChange(next: boolean) {
    // при каждом открытии начинаем с актуального значения
    if (next) setBanner(value ?? DEFAULT_BANNER);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="secondary">
            <FlagBannerIcon weight="bold" />
            {value ? "Изменить в конструкторе" : "Собрать флаг"}
          </Button>
        }
      />

      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Редактор флага</DialogTitle>
          <DialogDescription>
            Собери флаг из цветов и узоров или импортируй готовый код.
          </DialogDescription>
        </DialogHeader>

        <EditorBody banner={banner} setBanner={setBanner} />

        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>
            Отмена
          </DialogClose>
          <DialogClose render={<Button />} onClick={() => onApply(banner)}>
            <CheckIcon weight="bold" />
            Использовать этот флаг
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BannerField({
  value,
  onChange,
}: {
  value: Banner | null;
  onChange: (banner: Banner | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? serializeBanner(value) : "");
  const [error, setError] = useState<string | null>(null);

  function onText(next: string) {
    setText(next);
    if (!next.trim()) {
      setError(null);
      onChange(null);
      return;
    }
    const parsed = parseBannerInput(next);
    if (parsed.ok) {
      setError(null);
      onChange(parsed.banner);
    } else {
      setError(parsed.error);
      onChange(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {value ? (
        <BannerView banner={value} className="w-16" />
      ) : (
        <div className="grid aspect-1/2 w-16 place-items-center rounded-[3px] border border-dashed text-muted-foreground">
          <FlagBannerIcon className="size-6" weight="bold" />
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-2 flex flex-col items-start">
        <BannerEditorDialog
          open={open}
          onOpenChange={setOpen}
          value={value}
          onApply={(banner) => {
            onChange(banner);
            setText(serializeBanner(banner));
            setError(null);
          }}
        />

        <Input
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Или вставьте код: white|bs:red|cr:black"
          aria-label="Код флага"
          aria-invalid={Boolean(error)}
          className="font-mono text-xs w-1/2"
        />

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
