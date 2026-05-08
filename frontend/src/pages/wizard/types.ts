import type {
  AbilityCode,
  Alignment,
  Gender,
  LanguageCode,
} from "@/types/character";

export type EquipChoice = "set" | "gold";

export interface DraftState {
  class_code: string | null;
  subclass_code: string | null;
  level: number;
  background_code: string | null;
  race_code: string | null;
  gender: Gender | null;
  languages: LanguageCode[];
  alignment: Alignment | null;
  ability_scores: Partial<Record<AbilityCode, number>>;
  background_bonuses: Partial<Record<AbilityCode, number>>;
  chosen_skills: string[];
  feats: string[];
  equip_class: EquipChoice;
  equip_bg: EquipChoice;
  name: string;
}

export const initialDraft: DraftState = {
  class_code: null,
  subclass_code: null,
  level: 1,
  background_code: null,
  race_code: null,
  gender: null,
  languages: ["common"],
  alignment: null,
  ability_scores: {},
  background_bonuses: {},
  chosen_skills: [],
  feats: [],
  equip_class: "set",
  equip_bg: "set",
  name: "",
};

export const STEPS = [
  "Класс",
  "Предыстория",
  "Раса",
  "Язык",
  "Мировоззрение",
  "Характеристики",
  "Навыки",
  "Черты",
  "Снаряжение",
  "Итог",
] as const;
