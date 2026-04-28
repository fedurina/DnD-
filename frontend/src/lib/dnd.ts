import type { AbilityCode, AbilityScores, Alignment } from "@/types/character";

export const ABILITY_ORDER: AbilityCode[] = ["str", "dex", "con", "int", "wis", "cha"];
export const STANDARD_ARRAY: number[] = [15, 14, 13, 12, 10, 8];

export const ALIGNMENT_OPTIONS: { code: Alignment; name_ru: string }[] = [
  { code: "lawful_good", name_ru: "Законопослушный добрый" },
  { code: "neutral_good", name_ru: "Нейтральный добрый" },
  { code: "chaotic_good", name_ru: "Хаотичный добрый" },
  { code: "lawful_neutral", name_ru: "Законопослушный нейтральный" },
  { code: "neutral", name_ru: "Истинно нейтральный" },
  { code: "chaotic_neutral", name_ru: "Хаотичный нейтральный" },
  { code: "lawful_evil", name_ru: "Законопослушный злой" },
  { code: "neutral_evil", name_ru: "Нейтральный злой" },
  { code: "chaotic_evil", name_ru: "Хаотичный злой" },
];

export const ABILITY_NAMES_RU: Record<AbilityCode, { full: string; short: string }> = {
  str: { full: "Сила", short: "СИЛ" },
  dex: { full: "Ловкость", short: "ЛОВ" },
  con: { full: "Телосложение", short: "ТЕЛ" },
  int: { full: "Интеллект", short: "ИНТ" },
  wis: { full: "Мудрость", short: "МУД" },
  cha: { full: "Харизма", short: "ХАР" },
};

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function applyBonuses(
  base: AbilityScores,
  bonuses: Partial<Record<AbilityCode, number>>,
): AbilityScores {
  const out = { ...base };
  for (const k of ABILITY_ORDER) {
    out[k] = (out[k] ?? 0) + (bonuses[k] ?? 0);
  }
  return out;
}
