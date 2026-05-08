// Mapping from semantic position → AcroForm field name in the
// frontend/public/templates/DnD_2024.pdf template. The template's field names
// are auto-generated and non-semantic (`text_1imkp` etc.); these maps are
// derived from widget rectangles and visual verification. To remap a field,
// dump field positions with a one-shot Node script using
// `acroField.getWidgets()[0].getRectangle()`.

import type { AbilityCode } from "@/types/character";
import type {
  Background,
  CharacterClass,
  Feat,
  Item,
  Race,
  Skill,
  Subclass,
} from "@/types/reference";

export const TEMPLATE_URL = "/templates/DnD_2024.pdf";
export const FONT_URL = "/fonts/NotoSans-Regular.ttf";

export interface PdfRefs {
  classes: Record<string, CharacterClass>;
  races: Record<string, Race>;
  backgrounds: Record<string, Background>;
  skills: Record<string, Skill>;
  feats: Record<string, Feat>;
  items: Record<string, Item>;
  subclasses: Record<string, Subclass>;
}

// Top-of-page mapping. The template has only 3 full-width fields at the top
// (no separate slot for class/subclass on the same line as background/race),
// so we pack them via a separator.
export const TOP_FIELDS = {
  name: "text_1imkp", // line 1 — character name
  background_class: "text_2qgox", // line 2 — predystoria · class
  race_subclass: "text_3bfkv", // line 3 — vid · subclass
  level: "text_4deth", // small "УРОВЕНЬ" oval box
  xp: "text_5mocb", // "ОПЫТ" box below level
  ac: "text_6agjh", // "КЛАСС ЗАЩИТЫ" box
} as const;

// XP thresholds per PHB 2024 (index = level).
export const XP_FOR_LEVEL = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

// Ability tiles. Each tile has a big modifier circle (left) and a small score
// box (right). Both are fillable form fields. Saving-throw values live just
// below the tile.
//
// Layout in 2024 sheet:
//   Left column (x≈31):  STR (y=540), DEX (y=422), CON (y=275)
//   Right column (x≈137): INT (y=618), WIS (y=443), CHA (y=270)
export const ABILITY_FIELDS: Record<
  AbilityCode,
  { modifier: string; score: string; save: string }
> = {
  str: { modifier: "text_17vpmg", score: "text_23ewgq", save: "text_60zpuk" },
  dex: { modifier: "text_18ruyf", score: "text_26ccgh", save: "text_68bipd" },
  con: { modifier: "text_21kabi", score: "text_28owjh", save: "text_72gnbq" },
  int: { modifier: "text_19lqwv", score: "text_24rqar", save: "text_54bfgy" },
  wis: { modifier: "text_20zbar", score: "text_25blbj", save: "text_62yaan" },
  cha: { modifier: "text_22bxjy", score: "text_27jhio", save: "text_73cwxt" },
};

// 4 boxes mid-page (y=629) — left to right.
export const HEADER_STAT_BOXES = {
  initiative: "text_13wrft",
  speed: "text_14lvnq",
  size: "text_15cqja",
  passive_perception: "text_16wgea",
} as const;

// Top-left "БОНУС ВЛАДЕНИЯ" tile.
export const PROFICIENCY_BONUS_FIELD = "text_427aebp";

// Skill rows under each ability tile.
//   STR: Athletics
//   DEX: Acrobatics, Sleight of Hand, Stealth
//   INT: History, Arcana, Nature, Investigation, Religion
//   WIS: Perception, Survival, Medicine, Insight, Animal Handling
//   CHA: Performance, Intimidation, Deception, Persuasion
export const SKILL_FIELDS: Record<string, string> = {
  // STR
  athletics: "text_61knsn",
  // DEX
  acrobatics: "text_69srmm",
  sleight_of_hand: "text_70obrk",
  stealth: "text_71pflk",
  // INT
  history: "text_55nptn",
  arcana: "text_56ksru",
  nature: "text_57bjob",
  investigation: "text_58zoel",
  religion: "text_59mfqs",
  // WIS
  perception: "text_63uhiv",
  survival: "text_64odvk",
  medicine: "text_65hnhb",
  insight: "text_66djlf",
  animal_handling: "text_67cr",
  // CHA
  performance: "text_74rkfi",
  intimidation: "text_75pauh",
  deception: "text_76vfsc",
  persuasion: "text_77nads",
};

// Page 1 weapons & spell-attacks table — 6 rows × 4 cols.
export const WEAPON_ROWS: {
  name: string;
  bonus: string;
  damage: string;
  notes: string;
}[] = [
  { name: "text_95mtme",  bonus: "text_101ohoi", damage: "text_107qvwl", notes: "text_113tpwa" },
  { name: "text_96nzoa",  bonus: "text_102yibj", damage: "text_108aybq", notes: "text_114lhuk" },
  { name: "text_97iydj",  bonus: "text_103rlae", damage: "text_109slbn", notes: "text_115pcxn" },
  { name: "text_98wnad",  bonus: "text_104qwkw", damage: "text_110lbdh", notes: "text_116sohv" },
  { name: "text_99bdzl",  bonus: "text_105gvuz", damage: "text_111ubex", notes: "text_117fabc" },
  { name: "text_100zmbl", bonus: "text_106vkdo", damage: "text_112omg",  notes: "text_118cokl" },
];

// Free-text blocks rendered with page.drawText (multi-line form fields
// auto-resize and produce huge glyphs — we bypass them).
export const PAGE2_BOXES = {
  // "БИОГРАФИЯ И ХАРАКТЕР" / "ПРЕДЫСТОРИЯ И ЛИЧНОСТЬ" textarea.
  biography: { x: 412, y: 500, w: 175, h: 130 },
  // "ЯЗЫКИ" textarea.
  languages: { x: 412, y: 402, w: 175, h: 28 },
  // "СНАРЯЖЕНИЕ" textarea.
  equipment: { x: 412, y: 192, w: 175, h: 165 },
};

// Single-line below the biography textarea — alignment name (form field is fine).
export const ALIGNMENT_NAME_FIELD = "text_275cexd";

// Page 1 "ЧЕРТЫ" textarea (bottom-right) — drawn directly.
export const PAGE1_FEATS_BOX = { x: 412, y: 18, w: 175, h: 165 };

export const TEXTAREA_SIZE = 10;
