import type {
  AbilityCode,
  AbilityScores,
  Alignment,
  LanguageCode,
} from "@/types/character";

export const ABILITY_ORDER: AbilityCode[] = ["str", "dex", "con", "int", "wis", "cha"];
export const STANDARD_ARRAY: number[] = [15, 14, 13, 12, 10, 8];

export const ALIGNMENT_OPTIONS: {
  code: Alignment;
  name_ru: string;
  description_ru: string;
}[] = [
  {
    code: "lawful_good",
    name_ru: "Законопослушный добрый",
    description_ru:
      "Верят в честный порядок и справедливое общество, где сильные защищают слабых. Соблюдают законы и традиции с целью улучшить жизнь других.",
  },
  {
    code: "neutral_good",
    name_ru: "Нейтральный добрый",
    description_ru:
      "Творят добро ради самого добра, без оглядки на законы или стремления к хаосу. Делают то, что считают правильным.",
  },
  {
    code: "chaotic_good",
    name_ru: "Хаотичный добрый",
    description_ru:
      "Следуют своей совести, мало заботясь о чужих ожиданиях. Дорожат свободой, как своей, так и чужой, и помогают страдающим.",
  },
  {
    code: "lawful_neutral",
    name_ru: "Законопослушный нейтральный",
    description_ru:
      "Уважают традиции, законы и порядок. Верят, что порядок и организация важнее личных или моральных соображений.",
  },
  {
    code: "neutral",
    name_ru: "Истинно нейтральный",
    description_ru:
      "Делают то, что кажется наиболее подходящим в данный момент. Избегают крайностей и предпочитают нейтралитет, баланс и гармонию.",
  },
  {
    code: "chaotic_neutral",
    name_ru: "Хаотичный нейтральный",
    description_ru:
      "Следуют своим порывам и стремятся к личной свободе. Не любят правила и ожидания других, но и не стремятся разрушать.",
  },
  {
    code: "lawful_evil",
    name_ru: "Законопослушный злой",
    description_ru:
      "Методично берут то, что хотят, в рамках своего кодекса или законов общества. Используют традиции для эгоистичных целей.",
  },
  {
    code: "neutral_evil",
    name_ru: "Нейтральный злой",
    description_ru:
      "Делают всё, что могут сойти им с рук, без угрызений совести. Эгоистичны и не испытывают любви ни к порядку, ни к хаосу.",
  },
  {
    code: "chaotic_evil",
    name_ru: "Хаотичный злой",
    description_ru:
      "Действуют со своенравной жестокостью, движимые жадностью, ненавистью или жаждой разрушения. Непредсказуемы и импульсивны.",
  },
];

export const GENDER_OPTIONS: { code: "male" | "female"; name_ru: string }[] = [
  { code: "male", name_ru: "Мужской" },
  { code: "female", name_ru: "Женский" },
];

export const LANGUAGE_OPTIONS: { code: LanguageCode; name_ru: string }[] = [
  { code: "common", name_ru: "Общий" },
  { code: "common_sign", name_ru: "Общий язык жестов" },
  { code: "draconic", name_ru: "Драконий" },
  { code: "dwarvish", name_ru: "Дварфский" },
  { code: "elvish", name_ru: "Эльфийский" },
  { code: "giant", name_ru: "Великаний" },
  { code: "gnomish", name_ru: "Гномий" },
  { code: "goblin", name_ru: "Гоблинский" },
  { code: "halfling", name_ru: "Полуросликов" },
  { code: "orcish", name_ru: "Орочий" },
];

export const REQUIRED_LANGUAGE_COUNT = 3;

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

export const MAX_LEVEL = 20;

// Бонус мастерства по правилам 5.5e в зависимости от уровня: +2 (1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20).
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.min(Math.max(level, 1), MAX_LEVEL) - 1) / 4);
}

// Хиты: максимум кости здоровья на 1-м уровне, далее средний бросок (hit_die/2 + 1) за уровень.
// Плюс модификатор Телосложения за каждый уровень. Стандартная формула 5.5e.
export function hpAtLevel(
  hitDie: number,
  conMod: number,
  level: number,
): number {
  const lvl = Math.min(Math.max(level, 1), MAX_LEVEL);
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + (lvl - 1) * (avgPerLevel + conMod);
}
