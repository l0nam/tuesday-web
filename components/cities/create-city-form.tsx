"use client";

import { useState } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { BannerField } from "@/components/cities/banner-editor";
import { ErrorNote, useCityApi } from "@/components/cities/use-city-api";
import { serializeBanner, type Banner } from "@/lib/cities/banner";
import { CITY } from "@/lib/cities/rules";
import { XIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";

export function CreateCityForm() {
  const { busy, error, setError, call, router } = useCityApi();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [recruiting, setRecruiting] = useState(true);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  const nameLength = Array.from(name.trim()).length;
  const ready =
    nameLength >= CITY.nameMin && nameLength <= CITY.nameMax && banner !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!banner) {
      setError("Соберите флаг города");
      return;
    }
    const created = await call<{ id: number }>("/api/cities", "POST", {
      name,
      description,
      discordUrl,
      banner: serializeBanner(banner),
      recruiting,
    });
    if (created?.id) {
      router.push(`/cities/${created.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-6">
      {hintVisible && (
        <div className="relative flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <WarningIcon
            weight="bold"
            className="size-5 shrink-0 text-amber-400"
          />
          <p className="max-w-4xl">
            <b>Название и флаг изменить нельзя</b>, их выбирают один раз при
            создании. Описание, Discord-сервер и набор можно менять в любой
            момент. Один игрок может создать только один город.
          </p>

          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-2 right-2"
            onClick={() => setHintVisible(false)}
          >
            <XIcon weight="bold" />
          </Button>
        </div>
      )}

      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="city-name">Название города</FieldLabel>
            <Input
              id="city-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={CITY.nameMax + 8}
              placeholder="Например, Небесный Остров"
              autoComplete="off"
              required
            />
            <FieldDescription>
              От {CITY.nameMin} до {CITY.nameMax} символов. Название должно быть
              уникальным.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="city-name">Флаг города</FieldLabel>
            <BannerField value={banner} onChange={setBanner} />
          </Field>

          <Field>
            <FieldLabel htmlFor="city-description">Описание</FieldLabel>
            <Textarea
              id="city-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={CITY.descriptionMax}
              rows={4}
              className="max-h-60"
              placeholder="Кратко расскажите о своем городе"
            />
            <FieldDescription>
              {Array.from(description).length} / {CITY.descriptionMax}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="city-discord">
              Discord сервер города (необязательно)
            </FieldLabel>
            <Input
              id="city-discord"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.gg/..."
              autoComplete="off"
              inputMode="url"
            />
            <FieldDescription>
              Ссылка-приглашение вида https://discord.gg/abcdef.
            </FieldDescription>
          </Field>

          <Label className="cursor-pointer">
            <Checkbox
              checked={recruiting}
              onCheckedChange={(v) => setRecruiting(v === true)}
            />

            <div className="flex flex-col w-fit">
              <span>Открыть набор сразу</span>
              <span className="text-xs font-normal text-muted-foreground mt-0.5">
                Пока набор открыт, любой зарегистрированный игрок может подать
                заявку.
              </span>
            </div>
          </Label>
        </FieldGroup>
      </FieldSet>

      <ErrorNote message={error} />

      <Button type="submit" size="lg" disabled={busy || !ready}>
        {busy ? (
          <>
            <Spinner /> Создаю…
          </>
        ) : (
          "Создать город"
        )}
      </Button>
    </form>
  );
}
