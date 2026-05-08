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

// Best-effort positional mapping for the top of page 1 of the 2024 fillable
// template. Field names are non-semantic (auto-generated) so we map by what
// we believe each top row represents. If something's wrong visually, the
// summary page appended at the end always has the correct data.
const TOP_FIELDS = {
  name: "text_1imkp", // top row, full width
  background: "text_2qgox", // 2nd row, full width
  class_and_level: "text_3bfkv", // 3rd row, full width
  level: "text_4deth", // small box right of 1st row
} as const;

// 4 large boxes mid-page (y=629). Best-guess: AC, Initiative, Speed, HP.
const STAT_BOXES = {
  ac: "text_13wrft",
  initiative: "text_14lvnq",
  speed: "text_15cqja",
  hp: "text_16wgea",
} as const;

// 6 ability score boxes — best-guess by reading position from top to bottom.
// Left column (x≈31): three at y=540, 422, 275.
// Right column (x≈137): three at y=618, 443, 270.
// Standard 2024 layout puts STR top-left, then descend. This is a guess —
// will be refined after visual verification.
const ABILITY_BOXES: Partial<Record<AbilityCode, string>> = {
  str: "text_17vpmg", // (31, 540)
  con: "text_18ruyf", // (31, 422)
  wis: "text_21kabi", // (31, 275)
  dex: "text_19lqwv", // (137, 618)
  int: "text_20zbar", // (138, 443)
  cha: "text_22bxjy", // (137, 270)
};

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
    ? `${cls.name_ru} ${character.level}${subclass ? ` (${subclass.name_ru})` : ""}`
    : "";
  const raceLabel = race?.name_ru ?? "";
  const bgLabel = bg?.name_ru ?? "";

  // --- Top header (best-effort) ---
  safeSetText(form, TOP_FIELDS.name, character.name, cyrFont);
  safeSetText(form, TOP_FIELDS.background, bgLabel, cyrFont);
  safeSetText(form, TOP_FIELDS.class_and_level, classLabel, cyrFont);
  safeSetText(form, TOP_FIELDS.level, String(character.level), cyrFont);

  // --- Mid-page stat boxes ---
  safeSetText(form, STAT_BOXES.ac, String(ac), cyrFont);
  safeSetText(form, STAT_BOXES.initiative, formatModifier(dexMod), cyrFont);
  safeSetText(form, STAT_BOXES.speed, String(race?.speed ?? ""), cyrFont);
  safeSetText(form, STAT_BOXES.hp, String(hp), cyrFont);

  // --- Ability scores ---
  for (const a of ABILITY_ORDER) {
    const fname = ABILITY_BOXES[a];
    if (fname) safeSetText(form, fname, String(finalScores[a]), cyrFont);
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

