import type { InventoryEntry } from "./reference";

export type { InventoryEntry };

export type AbilityCode = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type Alignment =
  | "lawful_good" | "neutral_good" | "chaotic_good"
  | "lawful_neutral" | "neutral" | "chaotic_neutral"
  | "lawful_evil" | "neutral_evil" | "chaotic_evil";

export type Gender = "male" | "female";

export type LanguageCode =
  | "common" | "common_sign" | "dwarvish" | "elvish" | "giant"
  | "gnomish" | "goblin" | "halfling" | "orcish" | "draconic";

export type AbilityScores = Record<AbilityCode, number>;

export type EquipChoice = "set" | "gold";

export interface CharacterCreatePayload {
  name: string;
  alignment: Alignment;
  gender: Gender;
  level: number;
  race_code: string;
  class_code: string;
  subclass_code: string | null;
  background_code: string;
  ability_scores: AbilityScores;
  background_bonuses: Partial<Record<AbilityCode, number>>;
  chosen_skills: string[];
  languages: LanguageCode[];
  feats: string[];
  items: InventoryEntry[];
  gold: number;
  equip_class_choice: EquipChoice;
  equip_bg_choice: EquipChoice;
  current_hp?: number | null;
  temp_hp?: number;
}

export interface CharacterCampaignBrief {
  id: string;
  name: string;
  needs_attention: boolean;
}

export interface Character extends CharacterCreatePayload {
  id: string;
  user_id: string;
  current_hp: number | null;
  temp_hp: number;
  is_archived: boolean;
  campaigns: CharacterCampaignBrief[];
  created_at: string;
  updated_at: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  gender: Gender;
  race_code: string;
  class_code: string;
  subclass_code: string | null;
  background_code: string;
  is_archived: boolean;
  campaigns: CharacterCampaignBrief[];
  created_at: string;
}

export interface CharacterUpdatePayload {
  name?: string;
  alignment?: Alignment;
  gender?: Gender;
  level?: number;
  race_code?: string;
  class_code?: string;
  subclass_code?: string | null;
  background_code?: string;
  ability_scores?: AbilityScores;
  background_bonuses?: Partial<Record<AbilityCode, number>>;
  chosen_skills?: string[];
  languages?: LanguageCode[];
  feats?: string[];
  items?: InventoryEntry[];
  gold?: number;
  equip_class_choice?: EquipChoice;
  equip_bg_choice?: EquipChoice;
  current_hp?: number | null;
  temp_hp?: number;
}
