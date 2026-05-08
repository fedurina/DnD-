// Сопоставление «семантическая позиция → имя AcroForm-поля» в шаблоне
// frontend/public/templates/DnD_2024.pdf. Имена полей в шаблоне сгенерированы
// автоматически и несемантичны (`text_1imkp` и т.п.); эти карты составлены
// по координатам виджетов и визуальной сверке. Чтобы переопределить поле,
// дампите его позицию одноразовым Node-скриптом через
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

// Поля в шапке листа. В шаблоне всего 3 поля на всю ширину сверху (нет
// отдельного слота для класса/подкласса на одной строке с предысторией/расой),
// поэтому пакуем их через разделитель.
export const TOP_FIELDS = {
  name: "text_1imkp", // строка 1 — имя персонажа
  background_class: "text_2qgox", // строка 2 — предыстория · класс
  race_subclass: "text_3bfkv", // строка 3 — раса · подкласс
  level: "text_4deth", // маленькая овальная ячейка «УРОВЕНЬ»
  xp: "text_5mocb", // ячейка «ОПЫТ» под уровнем
  ac: "text_6agjh", // ячейка «КЛАСС ЗАЩИТЫ»
} as const;

// Пороги опыта по PHB 2024 (индекс = уровень).
export const XP_FOR_LEVEL = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

// Плитки характеристик. У каждой плитки большой кружок модификатора (слева)
// и маленькая ячейка значения (справа). Оба — заполняемые поля формы. Поля
// для спасбросков расположены прямо под плиткой.
//
// Расположение в листе 2024:
//   Левая колонка (x≈31):  СИЛ (y=540), ЛОВ (y=422), ТЕЛ (y=275)
//   Правая колонка (x≈137): ИНТ (y=618), МУД (y=443), ХАР (y=270)
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

// 4 ячейки в средней части страницы (y=629) — слева направо.
export const HEADER_STAT_BOXES = {
  initiative: "text_13wrft",
  speed: "text_14lvnq",
  size: "text_15cqja",
  passive_perception: "text_16wgea",
} as const;

// Плитка «БОНУС ВЛАДЕНИЯ» в верхнем-левом углу.
export const PROFICIENCY_BONUS_FIELD = "text_427aebp";

// Строки навыков под каждой плиткой характеристики.
//   СИЛ: Атлетика
//   ЛОВ: Акробатика, Ловкость рук, Скрытность
//   ИНТ: История, Магия, Природа, Расследование, Религия
//   МУД: Восприятие, Выживание, Медицина, Проницательность, Уход за животными
//   ХАР: Выступление, Запугивание, Обман, Убеждение
export const SKILL_FIELDS: Record<string, string> = {
  // СИЛ
  athletics: "text_61knsn",
  // ЛОВ
  acrobatics: "text_69srmm",
  sleight_of_hand: "text_70obrk",
  stealth: "text_71pflk",
  // ИНТ
  history: "text_55nptn",
  arcana: "text_56ksru",
  nature: "text_57bjob",
  investigation: "text_58zoel",
  religion: "text_59mfqs",
  // МУД
  perception: "text_63uhiv",
  survival: "text_64odvk",
  medicine: "text_65hnhb",
  insight: "text_66djlf",
  animal_handling: "text_67cr",
  // ХАР
  performance: "text_74rkfi",
  intimidation: "text_75pauh",
  deception: "text_76vfsc",
  persuasion: "text_77nads",
};

// Таблица оружия и заклинательных атак на странице 1 — 6 строк × 4 столбца.
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

// Блоки свободного текста, отрисовываемые через page.drawText (многострочные
// поля формы авторесайзят и выдают огромные глифы — мы их обходим).
export const PAGE2_BOXES = {
  // Текстовое поле «БИОГРАФИЯ И ХАРАКТЕР» / «ПРЕДЫСТОРИЯ И ЛИЧНОСТЬ».
  biography: { x: 412, y: 500, w: 175, h: 130 },
  // Текстовое поле «ЯЗЫКИ».
  languages: { x: 412, y: 402, w: 175, h: 28 },
  // Текстовое поле «СНАРЯЖЕНИЕ».
  equipment: { x: 412, y: 192, w: 175, h: 165 },
};

// Однострочное поле под блоком биографии — мировоззрение (стандартное поле формы подходит).
export const ALIGNMENT_NAME_FIELD = "text_275cexd";

// Текстовое поле «ЧЕРТЫ» на странице 1 (нижний правый угол) — отрисовывается напрямую.
export const PAGE1_FEATS_BOX = { x: 412, y: 18, w: 175, h: 165 };

export const TEXTAREA_SIZE = 10;
