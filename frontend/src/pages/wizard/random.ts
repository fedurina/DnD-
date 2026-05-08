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
 * Distribute Standard Array (15, 14, 13, 12, 10, 8) over the six abilities,
 * favoring the class's primary abilities (15 first, 14 second), then its
 * saving-throw abilities, then the rest in random order.
 */
function pickAbilityScores(cls: CharacterClass): AbilityScores {
  const values = [...STANDARD_ARRAY].sort((a, b) => b - a); // [15,14,13,12,10,8]
  const order: AbilityCode[] = [];
  const used = new Set<AbilityCode>();

  // Class primary abilities first.
  for (const a of cls.primary_abilities as AbilityCode[]) {
    if (!used.has(a)) {
      order.push(a);
      used.add(a);
    }
  }
  // Then saving-throw abilities.
  for (const a of cls.saving_throw_abilities as AbilityCode[]) {
    if (!used.has(a)) {
      order.push(a);
      used.add(a);
    }
  }
  // Remaining in shuffled order so two characters of the same class don't
  // produce identical low-stat layouts every time.
  const rest = shuffle(ABILITY_ORDER.filter((a) => !used.has(a)));
  for (const a of rest) order.push(a);

  const scores = {} as AbilityScores;
  order.forEach((code, i) => {
    scores[code] = values[i];
  });
  return scores;
}

/**
 * Pick background bonuses. Mode is random (1+1+1 or 2+1). For 2+1, the +2
 * lands on the ability that's most important for the class (intersection of
 * bg's allowed abilities with class primaries; falls back to a random one).
 */
function pickBackgroundBonuses(
  bg: Background,
  cls: CharacterClass,
): Partial<Record<AbilityCode, number>> {
  const allowed = bg.ability_scores as AbilityCode[];
  if (Math.random() < 0.5) {
    // 1+1+1 — must hit all three of bg's abilities.
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

/** Pick `cls.skill_choices_count` skills not already granted by the background. */
function pickSkills(cls: CharacterClass, bg: Background): string[] {
  const granted = new Set(bg.granted_skills);
  const available = cls.skill_options.filter((s) => !granted.has(s));
  return shuffle(available).slice(0, cls.skill_choices_count);
}

/** Common + 2 random non-common languages. */
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
 * Background's origin feat (mandatory) + one extra random origin feat (for
 * variety so re-rolls don't always show the same single feat). General feats
 * have level-4 prerequisites and fighting-style feats are class-gated, so we
 * stick to the prereq-free origin pool.
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
 * Generate a complete random character draft. Guaranteed to satisfy every
 * step's `isStepValid` and the backend's Pydantic validators.
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
  const level = 1; // MVP: fixed.

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
    // Each source independently rolls "set" (take the items) or "gold"
    // (take the alt starting gold). Gives variety in inventory + wallet.
    equip_class: Math.random() < 0.5 ? "set" : "gold",
    equip_bg: Math.random() < 0.5 ? "set" : "gold",
    name: randomName(race.code, gender),
  };
}
