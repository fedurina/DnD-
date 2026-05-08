import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  ALIGNMENT_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  abilityModifier,
  applyBonuses,
  formatModifier,
  hpAtLevel,
  proficiencyBonus,
} from "@/lib/dnd";
import type { AbilityCode, AbilityScores, Character } from "@/types/character";
import type {
  Background,
  CharacterClass,
  Feat,
  Item,
  Race,
  Skill,
  Subclass,
} from "@/types/reference";

const TEMPLATE_URL = "/templates/DnD_2024.pdf";
const FONT_URL = "/fonts/NotoSans-Regular.ttf";

interface PdfRefs {
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
const TOP_FIELDS = {
  name: "text_1imkp", // line 1 — character name
  background_class: "text_2qgox", // line 2 — predystoria | class
  race_subclass: "text_3bfkv", // line 3 — vid | subclass
  level: "text_4deth", // small "УРОВЕНЬ" oval box
  xp: "text_5mocb", // "ОПЫТ" box below level
  ac: "text_6agjh", // "КЛАСС ЗАЩИТЫ" box (was text_5mocb — wrong)
} as const;

// XP thresholds per PHB 2024 (index = level).
const XP_FOR_LEVEL = [
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
const ABILITY_FIELDS: Record<
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

// 4 boxes mid-page (y=629), best-guess by left-to-right position.
const HEADER_STAT_BOXES = {
  initiative: "text_13wrft",
  speed: "text_14lvnq",
  size: "text_15cqja",
  passive_perception: "text_16wgea",
} as const;

// Proficiency-bonus tile (top-left "БОНУС ВЛАДЕНИЯ"). Best-guess.
const PROFICIENCY_BONUS_FIELD = "text_427aebp";

// Skill rows under each ability tile. Map: skill code → form field name.
// Order in template (top to bottom under each tile):
//   STR: Athletics
//   DEX: Acrobatics, Sleight of Hand, Stealth
//   INT: History, Arcana, Nature, Investigation, Religion
//   WIS: Perception, Survival, Medicine, Insight, Animal Handling
//   CHA: Performance, Intimidation, Deception, Persuasion
const SKILL_FIELDS: Record<string, string> = {
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
const WEAPON_ROWS: { name: string; bonus: string; damage: string; notes: string }[] = [
  { name: "text_95mtme",  bonus: "text_101ohoi", damage: "text_107qvwl", notes: "text_113tpwa" },
  { name: "text_96nzoa",  bonus: "text_102yibj", damage: "text_108aybq", notes: "text_114lhuk" },
  { name: "text_97iydj",  bonus: "text_103rlae", damage: "text_109slbn", notes: "text_115pcxn" },
  { name: "text_98wnad",  bonus: "text_104qwkw", damage: "text_110lbdh", notes: "text_116sohv" },
  { name: "text_99bdzl",  bonus: "text_105gvuz", damage: "text_111ubex", notes: "text_117fabc" },
  { name: "text_100zmbl", bonus: "text_106vkdo", damage: "text_112omg",  notes: "text_118cokl" },
];

// Page 2 free-text blocks. We draw text directly onto the page (page.drawText)
// because multi-line form fields auto-resize the font to fit and renderers
// produce gigantic glyphs for short content. These rectangles match the
// underlying form field dimensions; we use them as drawing bounds.
const PAGE2_BOXES = {
  // "БИОГРАФИЯ И ХАРАКТЕР" / "ПРЕДЫСТОРИЯ И ЛИЧНОСТЬ" textarea.
  biography: { x: 412, y: 500, w: 175, h: 130 },
  // "ЯЗЫКИ" textarea.
  languages: { x: 412, y: 402, w: 175, h: 28 },
  // "СНАРЯЖЕНИЕ" textarea.
  equipment: { x: 412, y: 192, w: 175, h: 165 },
};

// Single-line below the biography textarea — alignment name (form field is fine here).
const ALIGNMENT_NAME_FIELD = "text_275cexd";

// Page 1 "ЧЕРТЫ" textarea (bottom-right). We draw feats list onto the page.
const PAGE1_FEATS_BOX = { x: 412, y: 18, w: 175, h: 165 };

/** Wrap text by words, measuring real glyph width with the given font. */
function wrapByWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let buf = "";
    for (const w of words) {
      const candidate = buf ? `${buf} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && buf) {
        lines.push(buf);
        buf = w;
      } else {
        buf = candidate;
      }
    }
    if (buf) lines.push(buf);
  }
  return lines;
}

/** Draw word-wrapped text into a rectangular box on the given page. */
function drawWrappedText(
  page: ReturnType<PDFDocument["getPages"]>[number],
  text: string,
  box: { x: number; y: number; w: number; h: number },
  font: PDFFont,
  size: number,
  lineHeight = size * 1.25,
) {
  if (!text) return;
  const lines = wrapByWidth(text, font, size, box.w);
  // Start near the top of the box.
  let y = box.y + box.h - size;
  for (const line of lines) {
    if (y < box.y) break; // ran out of vertical space
    page.drawText(line, {
      x: box.x,
      y,
      size,
      font,
      color: rgb(0.05, 0.05, 0.07),
    });
    y -= lineHeight;
  }
}

function safeSetText(
  form: ReturnType<PDFDocument["getForm"]>,
  fieldName: string,
  value: string,
  font: PDFFont,
) {
  try {
    const f = form.getTextField(fieldName);
    f.setText(value);
    f.updateAppearances(font);
  } catch {
    // field missing or wrong type — ignore (templates change over time)
  }
}

export async function exportCharacterPdf(
  character: Character,
  refs: PdfRefs,
): Promise<Uint8Array> {
  const [templateBytes, fontBytes] = await Promise.all([
    fetch(TEMPLATE_URL).then((r) => {
      if (!r.ok) throw new Error("Не удалось загрузить шаблон листа");
      return r.arrayBuffer();
    }),
    fetch(FONT_URL).then((r) => {
      if (!r.ok) throw new Error("Не удалось загрузить шрифт");
      return r.arrayBuffer();
    }),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const cyrFont = await doc.embedFont(fontBytes, { subset: true });

  const form = doc.getForm();
  // Use the cyrillic font as the form's default appearance font so default
  // appearance strings drawn by viewers don't break on Russian glyphs.
  try {
    form.updateFieldAppearances(cyrFont);
  } catch {
    // older pdf-lib versions don't expose this — fall back to per-field updates
  }

  const cls = refs.classes[character.class_code];
  const race = refs.races[character.race_code];
  const bg = refs.backgrounds[character.background_code];
  const subclass = character.subclass_code
    ? refs.subclasses[character.subclass_code] ?? null
    : null;

  const finalScores = applyBonuses(
    character.ability_scores as AbilityScores,
    character.background_bonuses as Partial<Record<AbilityCode, number>>,
  );
  const conMod = abilityModifier(finalScores.con);
  const dexMod = abilityModifier(finalScores.dex);
  const hp = hpAtLevel(cls?.hit_die ?? 0, conMod, character.level);
  const ac = 10 + dexMod;
  const pb = proficiencyBonus(character.level);

  const classLabel = cls
    ? `${cls.name_ru}${cls.name_ru ? ` · ${character.level} ур.` : ""}`
    : "";
  const raceLabel = race?.name_ru ?? "";
  const bgLabel = bg?.name_ru ?? "";
  const subclassLabel = subclass?.name_ru ?? "";

  // Form fields use the PDF template's own font size (any setFontSize call is
  // ignored by viewers in favour of the field's default appearance). The only
  // size we actually control is for text we draw directly on the page below.
  const TEXTAREA_SIZE = 10;

  // --- Top header ---
  safeSetText(form, TOP_FIELDS.name, character.name, cyrFont);
  safeSetText(
    form,
    TOP_FIELDS.background_class,
    bgLabel + (classLabel ? `   ·   ${classLabel}` : ""),
    cyrFont,
  );
  safeSetText(
    form,
    TOP_FIELDS.race_subclass,
    raceLabel + (subclassLabel ? `   ·   ${subclassLabel}` : ""),
    cyrFont,
  );
  safeSetText(form, TOP_FIELDS.level, String(character.level), cyrFont);
  safeSetText(
    form,
    TOP_FIELDS.xp,
    String(XP_FOR_LEVEL[Math.min(20, Math.max(1, character.level))]),
    cyrFont,
  );
  safeSetText(form, TOP_FIELDS.ac, String(ac), cyrFont);

  // --- Ability scores + modifiers + saves ---
  const profSaves = new Set(cls?.saving_throw_abilities ?? []);
  for (const a of ABILITY_ORDER) {
    const f = ABILITY_FIELDS[a];
    const score = finalScores[a];
    const mod = abilityModifier(score);
    const save = mod + (profSaves.has(a) ? pb : 0);
    safeSetText(form, f.score, String(score), cyrFont);
    safeSetText(form, f.modifier, formatModifier(mod), cyrFont);
    safeSetText(form, f.save, formatModifier(save), cyrFont);
  }

  // --- Skill values (mod + pb if proficient) ---
  const proficientSkills = new Set([
    ...(bg?.granted_skills ?? []),
    ...character.chosen_skills,
  ]);
  for (const [skillCode, fieldName] of Object.entries(SKILL_FIELDS)) {
    const sk = refs.skills[skillCode];
    if (!sk) continue;
    const ab = sk.ability_code as AbilityCode;
    const mod = abilityModifier(finalScores[ab]);
    const total = mod + (proficientSkills.has(skillCode) ? pb : 0);
    safeSetText(form, fieldName, formatModifier(total), cyrFont);
  }

  // --- Mid-page header stats ---
  const wisMod = abilityModifier(finalScores.wis);
  const profPerception =
    character.chosen_skills.includes("perception") ||
    (bg?.granted_skills ?? []).includes("perception");
  const passivePerception = 10 + wisMod + (profPerception ? pb : 0);
  const sizeShort = race?.size === "small" ? "S" : "M";
  safeSetText(form, HEADER_STAT_BOXES.initiative, formatModifier(dexMod), cyrFont);
  safeSetText(form, HEADER_STAT_BOXES.speed, String(race?.speed ?? ""), cyrFont);
  safeSetText(form, HEADER_STAT_BOXES.size, sizeShort, cyrFont);
  safeSetText(form, HEADER_STAT_BOXES.passive_perception, String(passivePerception), cyrFont);

  // --- Proficiency bonus tile (top-left) ---
  safeSetText(form, PROFICIENCY_BONUS_FIELD, `+${pb}`, cyrFont);

  // --- Weapons table (page 1) ---
  const weapons = character.items.filter((it) => refs.items[it.code]?.type === "weapon");
  weapons.slice(0, WEAPON_ROWS.length).forEach((w, i) => {
    const row = WEAPON_ROWS[i];
    const ref = refs.items[w.code];
    safeSetText(form, row.name, ref?.name_ru ?? w.code, cyrFont);
    if (w.qty > 1) {
      safeSetText(form, row.notes, `× ${w.qty}`, cyrFont);
    }
  });

  // --- Page 1: feats list (drawn directly to avoid auto-size) ---
  const pages = doc.getPages();
  const page1 = pages[0];
  if (character.feats.length > 0) {
    const featsText = character.feats
      .map((c) => refs.feats[c]?.name_ru ?? c)
      .join("; ");
    drawWrappedText(page1, featsText, PAGE1_FEATS_BOX, cyrFont, TEXTAREA_SIZE);
  }

  // --- Page 2: alignment name (form field — single line is fine) ---
  const alignment = ALIGNMENT_OPTIONS.find((a) => a.code === character.alignment);
  if (alignment) {
    safeSetText(form, ALIGNMENT_NAME_FIELD, alignment.name_ru, cyrFont);
  }

  // --- Page 2: biography/character (alignment description), languages, equipment.
  //     We draw these directly because multi-line form fields auto-resize and
  //     produce gigantic glyphs for short content. ---
  const page2 = pages[1];
  if (page2 && alignment) {
    drawWrappedText(
      page2,
      alignment.description_ru,
      PAGE2_BOXES.biography,
      cyrFont,
      TEXTAREA_SIZE,
    );
  }

  if (page2) {
    const languageList = character.languages
      .map((c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.name_ru ?? c)
      .join("; ");
    drawWrappedText(page2, languageList, PAGE2_BOXES.languages, cyrFont, TEXTAREA_SIZE);

    const equipmentParts = character.items.map((it) => {
      const ref = refs.items[it.code];
      const name = ref?.name_ru ?? it.code;
      return it.qty > 1 ? `${name} × ${it.qty}` : name;
    });
    if (character.gold > 0) equipmentParts.push(`золото ${character.gold} зм`);
    drawWrappedText(page2, equipmentParts.join("; "), PAGE2_BOXES.equipment, cyrFont, TEXTAREA_SIZE);
  }

  // --- Append a clean summary page so all data is captured regardless of
  //     whether the random-field mapping above lands correctly. ---
  await appendSummaryPage(doc, cyrFont, character, refs, {
    cls,
    race,
    bg,
    subclass,
    finalScores,
    hp,
    ac,
    pb,
  });

  return await doc.save();
}

interface SummaryCtx {
  cls: CharacterClass | undefined;
  race: Race | undefined;
  bg: Background | undefined;
  subclass: Subclass | null;
  finalScores: AbilityScores;
  hp: number;
  ac: number;
  pb: number;
}

async function appendSummaryPage(
  doc: PDFDocument,
  font: PDFFont,
  character: Character,
  refs: PdfRefs,
  ctx: SummaryCtx,
) {
  const page = doc.addPage([595, 842]); // A4 portrait
  const { height } = page.getSize();
  const margin = 36;
  let y = height - margin;

  const ink = rgb(0.1, 0.1, 0.12);
  const subtle = rgb(0.4, 0.4, 0.45);

  const drawText = (
    text: string,
    opts: { x?: number; size?: number; color?: ReturnType<typeof rgb>; bold?: boolean } = {},
  ) => {
    const x = opts.x ?? margin;
    page.drawText(text, {
      x,
      y,
      size: opts.size ?? 10,
      font,
      color: opts.color ?? ink,
    });
  };

  const advance = (n = 14) => {
    y -= n;
  };

  drawText("Лист персонажа · D&D 2024", { size: 16 });
  advance(22);

  drawText(character.name, { size: 20 });
  advance(20);

  const subtitleParts: string[] = [];
  if (ctx.race) subtitleParts.push(ctx.race.name_ru);
  if (ctx.cls) {
    subtitleParts.push(
      `${ctx.cls.name_ru} ${character.level}${ctx.subclass ? ` (${ctx.subclass.name_ru})` : ""}`,
    );
  }
  if (ctx.bg) subtitleParts.push(ctx.bg.name_ru);
  const alignmentName =
    ALIGNMENT_OPTIONS.find((a) => a.code === character.alignment)?.name_ru ??
    character.alignment;
  subtitleParts.push(alignmentName);
  drawText(subtitleParts.join(" · "), { size: 11, color: subtle });
  advance(20);

  // Personal block.
  drawText("Личное", { size: 12 });
  advance(14);
  const genderName =
    GENDER_OPTIONS.find((g) => g.code === character.gender)?.name_ru ??
    character.gender;
  drawText(`Пол: ${genderName}`);
  advance();
  drawText(
    `Языки: ${character.languages
      .map((c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.name_ru ?? c)
      .join(", ")}`,
  );
  advance(20);

  // Stats row.
  drawText("Боевые показатели", { size: 12 });
  advance(14);
  drawText(
    `Хиты: ${ctx.hp}    КЗ: ${ctx.ac}    Инициатива: ${formatModifier(
      abilityModifier(ctx.finalScores.dex),
    )}    Скорость: ${ctx.race?.speed ?? "?"} фт    Бонус мастерства: +${ctx.pb}`,
  );
  advance(20);

  // Ability scores table.
  drawText("Характеристики", { size: 12 });
  advance(14);
  const colX = [margin, margin + 140, margin + 220, margin + 320];
  drawText("Характеристика", { x: colX[0] });
  drawText("Значение", { x: colX[1] });
  drawText("Модификатор", { x: colX[2] });
  drawText("Спасбросок", { x: colX[3] });
  advance();
  const profSaves = new Set(ctx.cls?.saving_throw_abilities ?? []);
  for (const a of ABILITY_ORDER) {
    const score = ctx.finalScores[a];
    const mod = abilityModifier(score);
    const isProf = profSaves.has(a);
    const save = mod + (isProf ? ctx.pb : 0);
    drawText(ABILITY_NAMES_RU[a].full, { x: colX[0] });
    drawText(String(score), { x: colX[1] });
    drawText(formatModifier(mod), { x: colX[2] });
    drawText(`${formatModifier(save)}${isProf ? " (◉)" : ""}`, { x: colX[3] });
    advance();
  }
  advance(8);

  // Skills.
  drawText("Навыки", { size: 12 });
  advance(14);
  const allSkills = new Set([
    ...(ctx.bg?.granted_skills ?? []),
    ...character.chosen_skills,
  ]);
  for (const code of Array.from(allSkills).sort()) {
    const sk = refs.skills[code];
    drawText(`• ${sk?.name_ru ?? code}`);
    advance();
  }
  advance(8);

  // Feats.
  if (character.feats.length > 0) {
    drawText("Черты", { size: 12 });
    advance(14);
    for (const code of character.feats) {
      const f = refs.feats[code];
      drawText(`• ${f?.name_ru ?? code}`);
      advance();
      if (f?.description_ru) {
        const wrapped = wrapText(f.description_ru, 95);
        for (const line of wrapped) {
          drawText(`  ${line}`, { color: subtle, size: 9 });
          advance(11);
        }
      }
      if (y < margin + 60) {
        // ran out of room — break gracefully
        return;
      }
    }
    advance(8);
  }

  // Equipment + gold.
  drawText("Снаряжение и золото", { size: 12 });
  advance(14);
  drawText(`Золото: ${character.gold} зм`);
  advance();
  if (character.items.length === 0) {
    drawText("Без предметов в инвентаре.", { color: subtle });
    advance();
  } else {
    for (const it of character.items) {
      const ref = refs.items[it.code];
      const name = ref?.name_ru ?? it.code;
      drawText(`• ${name}${it.qty > 1 ? ` × ${it.qty}` : ""}`);
      advance();
      if (y < margin + 20) return;
    }
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let buf = "";
  for (const w of words) {
    const candidate = buf ? `${buf} ${w}` : w;
    if (candidate.length > maxChars) {
      if (buf) lines.push(buf);
      buf = w;
    } else {
      buf = candidate;
    }
  }
  if (buf) lines.push(buf);
  return lines;
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

