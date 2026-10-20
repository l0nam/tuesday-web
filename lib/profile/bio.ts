import { PROFILE } from "@/lib/profile/config";

/**
 * Очистка текста «О себе» перед сохранением. Сам Markdown не вырезается (он безопасно
 * отображается на странице), убираются только невидимые управляющие символы и лишние пустые строки.
 */

const MAX_LINES = 100;

// Управляющие символы (кроме \n и \t), а также символы смены направления текста, которыми подделывают надписи
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩﻿]/g;

export type BioResult = { ok: true; value: string | null } | { ok: false; error: string };

export function normalizeBio(input: string, maxLength: number = PROFILE.bioMaxLength): BioResult {
  const text = input
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (Array.from(text).length > maxLength) {
    return { ok: false, error: `Описание слишком длинное: максимум ${maxLength} символов` };
  }
  if (text.split("\n").length > MAX_LINES) {
    return { ok: false, error: `Слишком много строк: максимум ${MAX_LINES}` };
  }
  return { ok: true, value: text === "" ? null : text };
}
