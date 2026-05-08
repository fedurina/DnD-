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
  Race,
  Subclass,
} from "@/types/reference";

import {
  ABILITY_FIELDS,
  ALIGNMENT_NAME_FIELD,
  FONT_URL,
  HEADER_STAT_BOXES,
  PAGE1_FEATS_BOX,
  PAGE2_BOXES,
  PROFICIENCY_BONUS_FIELD,
  type PdfRefs,
  SKILL_FIELDS,
  TEMPLATE_URL,
  TEXTAREA_SIZE,
  TOP_FIELDS,
  WEAPON_ROWS,
  XP_FOR_LEVEL,
} from "./fields";
import { drawWrappedText, safeSetText, wrapByWidth } from "./draw";

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
  // Делаем кириллический шрифт default appearance у формы, чтобы просмотрщики
  // не ломались на русских глифах, когда сами пересчитывают внешний вид полей.
  try {
    form.updateFieldAppearances(cyrFont);
  } catch {
    // старые версии pdf-lib не предоставляют этот метод — падаем на пообмещение полей
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

  const classLabel = cls ? `${cls.name_ru} · ${character.level} ур.` : "";
  const raceLabel = race?.name_ru ?? "";
  const bgLabel = bg?.name_ru ?? "";
  const subclassLabel = subclass?.name_ru ?? "";

  // --- Шапка страницы ---
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

  // --- Характеристики + модификаторы + спасброски ---
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

  // --- Значения навыков (модификатор + бонус мастерства, если есть владение) ---
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

  // --- Показатели в середине страницы ---
  const wisMod = abilityModifier(finalScores.wis);
  const profPerception =
    character.chosen_skills.includes("perception") ||
    (bg?.granted_skills ?? []).includes("perception");
  const passivePerception = 10 + wisMod + (profPerception ? pb : 0);
  const sizeShort = race?.size === "small" ? "S" : "M";
  safeSetText(form, HEADER_STAT_BOXES.initiative, formatModifier(dexMod), cyrFont);
  safeSetText(form, HEADER_STAT_BOXES.speed, String(race?.speed ?? ""), cyrFont);
  safeSetText(form, HEADER_STAT_BOXES.size, sizeShort, cyrFont);
  safeSetText(
    form,
    HEADER_STAT_BOXES.passive_perception,
    String(passivePerception),
    cyrFont,
  );

  // --- Плитка бонуса мастерства (верхний левый угол) ---
  safeSetText(form, PROFICIENCY_BONUS_FIELD, `+${pb}`, cyrFont);

  // --- Таблица оружия (страница 1) ---
  const weapons = character.items.filter(
    (it) => refs.items[it.code]?.type === "weapon",
  );
  weapons.slice(0, WEAPON_ROWS.length).forEach((w, i) => {
    const row = WEAPON_ROWS[i];
    const ref = refs.items[w.code];
    safeSetText(form, row.name, ref?.name_ru ?? w.code, cyrFont);
    if (w.qty > 1) {
      safeSetText(form, row.notes, `× ${w.qty}`, cyrFont);
    }
  });

  // --- Страница 1: список черт (отрисовываем напрямую, чтобы обойти авторесайз) ---
  const pages = doc.getPages();
  const page1 = pages[0];
  if (character.feats.length > 0) {
    const featsText = character.feats
      .map((c) => refs.feats[c]?.name_ru ?? c)
      .join("; ");
    drawWrappedText(page1, featsText, PAGE1_FEATS_BOX, cyrFont, TEXTAREA_SIZE);
  }

  // --- Страница 2: название мировоззрения (поле формы — одной строки достаточно) ---
  const alignment = ALIGNMENT_OPTIONS.find((a) => a.code === character.alignment);
  if (alignment) {
    safeSetText(form, ALIGNMENT_NAME_FIELD, alignment.name_ru, cyrFont);
  }

  // --- Текстовые блоки страницы 2 рисуем напрямую (авторесайз поля формы раздул бы глифы) ---
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
    drawWrappedText(
      page2,
      equipmentParts.join("; "),
      PAGE2_BOXES.equipment,
      cyrFont,
      TEXTAREA_SIZE,
    );
  }

  // --- Гарантированный fallback: дописываем чистую сводную страницу, чтобы
  //     все данные были видны, даже если переименование поля в шаблоне сломает
  //     маппинг выше. ---
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
  const page = doc.addPage([595, 842]); // A4, портретная ориентация
  const { height, width: pageWidth } = page.getSize();
  const margin = 36;
  let y = height - margin;

  const ink = rgb(0.1, 0.1, 0.12);
  const subtle = rgb(0.4, 0.4, 0.45);

  const drawText = (
    text: string,
    opts: {
      x?: number;
      size?: number;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) => {
    page.drawText(text, {
      x: opts.x ?? margin,
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

  drawText("Боевые показатели", { size: 12 });
  advance(14);
  drawText(
    `Хиты: ${ctx.hp}    КЗ: ${ctx.ac}    Инициатива: ${formatModifier(
      abilityModifier(ctx.finalScores.dex),
    )}    Скорость: ${ctx.race?.speed ?? "?"} фт    Бонус мастерства: +${ctx.pb}`,
  );
  advance(20);

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

  if (character.feats.length > 0) {
    drawText("Черты", { size: 12 });
    advance(14);
    for (const code of character.feats) {
      const f = refs.feats[code];
      drawText(`• ${f?.name_ru ?? code}`);
      advance();
      if (f?.description_ru) {
        const wrapped = wrapByWidth(
          f.description_ru,
          font,
          9,
          pageWidth - margin * 2 - 12,
        );
        for (const line of wrapped) {
          drawText(`  ${line}`, { color: subtle, size: 9 });
          advance(11);
        }
      }
      if (y < margin + 60) return;
    }
    advance(8);
  }

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
