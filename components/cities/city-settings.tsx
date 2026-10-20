"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ErrorNote, useCityApi } from "@/components/cities/use-city-api";
import { CITY } from "@/lib/cities/rules";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLabel,
} from "../ui/field";
import { CheckCircleIcon, ProhibitIcon } from "@phosphor-icons/react/dist/ssr";

export function CitySettings({
  cityId,
  recruiting,
  discordUrl,
  description,
}: {
  cityId: number;
  recruiting: boolean;
  discordUrl: string | null;
  description: string | null;
}) {
  const { busy, error, call, refresh } = useCityApi();
  const [discord, setDiscord] = useState(discordUrl ?? "");
  const [text, setText] = useState(description ?? "");
  const [saved, setSaved] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaved(false);
    if (await call(`/api/cities/${cityId}`, "PATCH", body)) {
      setSaved(true);
      refresh();
    }
  }

  const detailsDirty =
    discord.trim() !== (discordUrl ?? "") ||
    text.trim() !== (description ?? "");

  return (
    <div className="space-y-5">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-discord">Discord сервер</FieldLabel>
            <Input
              id="settings-discord"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              placeholder="https://discord.gg/..."
              inputMode="url"
              autoComplete="off"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-description">Описание</FieldLabel>
            <Textarea
              id="settings-description"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={CITY.descriptionMax}
              rows={4}
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <ErrorNote message={error} />
      {saved && !error && <p className="text-sm text-primary">Сохранено</p>}

      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => void patch({ discordUrl: discord, description: text })}
          disabled={busy || !detailsDirty}
        >
          {busy ? (
            <>
              <Spinner /> Сохраняю…
            </>
          ) : (
            "Сохранить"
          )}
        </Button>

        <Button
          variant={recruiting ? "secondary" : "default"}
          onClick={() => void patch({ recruiting: !recruiting })}
          disabled={busy}
        >
          {recruiting ? (
            <>
              <ProhibitIcon weight="bold" />
              <span>Закрыть набор</span>
            </>
          ) : (
            <>
              <CheckCircleIcon weight="bold" />
              <span>Открыть набор</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
