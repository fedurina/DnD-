import { ABILITY_ORDER, LANGUAGE_OPTIONS, STANDARD_ARRAY } from "@/lib/dnd";
import { randomName } from "@/lib/names";
import type {
  AbilityCode,
  Alignment,
  AbilityScores,
  Gender,
  LanguageCode,
} from "@/types/character";
import type {
  Background,
  CharacterClass,
  Feat,
  Race,
  Subclass,
} from "@/types/reference";

import type { DraftState } from "./types";

interface RandomDraftRefs {
  classes: CharacterClass[];
  races: Race[];
  backgrounds: Background[];
  subclasses: Subclass[];
  feats: Feat[];
}

const ALIGNMENTS: Alignment[] = [
  "lawful_good", "neutral_good", "chaotic_good",
  "lawful_neutral", "neutral", "chaotic_neutral",
  "lawful_evil", "neutral_evil", "chaotic_evil",
];

const GENDERS: Gender[] = ["male", "female"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Раскладывает Standard Array (15, 14, 13, 12, 10, 8) по шести характеристикам:
 * сначала отдаёт значения основным характеристикам класса (15 — первой, 14 —
 * второй), затем характеристикам спасбросков, затем остальным в случайном порядке.
 */
function pickAbilityScores(cls: CharacterClass): AbilityScores {
  const values = [...STANDARD_ARRAY].sort((a, b) => b - a); // [15,14,13,12,10,8]
  const order: AbilityCode[] = [];
  const used = new Set<AbilityCode>();

  // Сначала — основные характеристики класса.
  for (const a of cls.primary_abilities as AbilityCode[]) {
    if (!used.has(a)) {
      order.push(a);
      used.add(a);
    }
  }
  // Затем — характеристики спасбросков класса.
  for (const a of cls.saving_throw_abilities as AbilityCode[]) {
    if (!used.has(a)) {
      order.push(a);
      used.add(a);
    }
  }
  // Остальные — в перемешанном порядке, чтобы у двух персонажей одного класса
  // не получались каждый раз одинаковые расклады низких характеристик.
  const rest = shuffle(ABILITY_ORDER.filter((a) => !used.has(a)));
  for (const a of rest) order.push(a);

  const scores = {} as AbilityScores;
  order.forEach((code, i) => {
    scores[code] = values[i];
  });
  return scores;
}

/**
 * Выбирает бонусы предыстории. Режим случайный (1+1+1 или 2+1). При 2+1 +2
 * уходит на ту характеристику, которая важнее для класса (пересечение
 * допустимых для bg характеристик с основными у класса; иначе — случайная).
 */
function pickBackgroundBonuses(
  bg: Background,
  cls: CharacterClass,
): Partial<Record<AbilityCode, number>> {
  const allowed = bg.ability_scores as AbilityCode[];
  if (Math.random() < 0.5) {
    // 1+1+1 — должны попасть во все три характеристики предыстории.
    const out: Partial<Record<AbilityCode, number>> = {};
    for (const a of allowed) out[a] = 1;
    return out;
  }
  // 2+1
  const primarySet = new Set(cls.primary_abilities as AbilityCode[]);
  const aligned = allowed.filter((a) => primarySet.has(a));
  const twoAb = aligned.length > 0 ? pick(aligned) : pick(allowed);
  const oneCandidates = allowed.filter((a) => a !== twoAb);
  const oneAb = pick(oneCandidates);
  return { [twoAb]: 2, [oneAb]: 1 };
}

/** Выбирает `cls.skill_choices_count` навыков, которых ещё не дала предыстория. */
function pickSkills(cls: CharacterClass, bg: Background): string[] {
  const granted = new Set(bg.granted_skills);
  const available = cls.skill_options.filter((s) => !granted.has(s));
  return shuffle(available).slice(0, cls.skill_choices_count);
}

/** Общий + 2 случайных необщих языка. */
function pickLanguages(): LanguageCode[] {
  const others = LANGUAGE_OPTIONS.map((l) => l.code).filter(
    (c) => c !== "common",
  );
  return ["common" as LanguageCode, ...shuffle(others).slice(0, 2)];
}

function pickSubclass(
  cls: CharacterClass,
  level: number,
  subclasses: Subclass[],
): string | null {
  if (level < cls.subclass_start_level) return null;
  const eligible = subclasses.filter((s) => s.class_code === cls.code);
  return eligible.length > 0 ? pick(eligible).code : null;
}

/**
 * Изначальная черта предыстории (обязательная) + одна дополнительная случайная
 * изначальная черта (для разнообразия, чтобы при перебросах не выпадала одна и
 * та же единственная черта). Общие черты требуют 4-го уровня, а черты боевых
 * стилей привязаны к классу, поэтому остаёмся в пуле изначальных без требований.
 */
function pickFeats(bg: Background, allFeats: Feat[]): string[] {
  const result: string[] = [];
  if (bg.feat_code) result.push(bg.feat_code);

  const extraPool = allFeats.filter(
    (f) => f.category === "origin" && f.code !== bg.feat_code,
  );
  if (extraPool.length > 0) {
    result.push(pick(extraPool).code);
  }
  return result;
}

/**
 * Генерирует полный случайный черновик персонажа. Гарантированно проходит
 * `isStepValid` каждого шага и Pydantic-валидаторы на бэке.
 */
export function randomDraft(refs: RandomDraftRefs): DraftState {
  if (refs.classes.length === 0 || refs.races.length === 0 || refs.backgrounds.length === 0) {
    throw new Error("Справочники не загружены, невозможно сгенерировать персонажа");
  }

  const cls = pick(refs.classes);
  const race = pick(refs.races);
  const bg = pick(refs.backgrounds);
  const gender = pick(GENDERS);
  const alignment = pick(ALIGNMENTS);
  const level = 1; // MVP: фиксированный.

  const ability_scores = pickAbilityScores(cls);
  const background_bonuses = pickBackgroundBonuses(bg, cls);
  const chosen_skills = pickSkills(cls, bg);
  const languages = pickLanguages();
  const subclass_code = pickSubclass(cls, level, refs.subclasses);

  return {
    class_code: cls.code,
    subclass_code,
    level,
    background_code: bg.code,
    race_code: race.code,
    gender,
    languages,
    alignment,
    ability_scores,
    background_bonuses,
    chosen_skills,
    feats: pickFeats(bg, refs.feats),
    // Каждый источник независимо выбирает «set» (взять предметы) или «gold»
    // (взять альтернативное стартовое золото). Даёт разнообразие инвентаря и кошелька.
    equip_class: Math.random() < 0.5 ? "set" : "gold",
    equip_bg: Math.random() < 0.5 ? "set" : "gold",
    name: randomName(race.code, gender),
  };
}
