export interface Ability {
  code: string;
  name_ru: string;
  short_ru: string;
}

export interface Skill {
  code: string;
  name_ru: string;
  ability_code: string;
}

export interface RaceTrait {
  name_ru: string;
  description_ru: string;
}

export interface Race {
  code: string;
  name_ru: string;
  description_ru: string;
  size: "small" | "medium";
  speed: number;
  traits: RaceTrait[];
}

export interface InventoryEntry {
  code: string;
  qty: number;
}

export interface CharacterClass {
  code: string;
  name_ru: string;
  description_ru: string;
  hit_die: number;
  primary_abilities: string[];
  saving_throw_abilities: string[];
  skill_choices_count: number;
  skill_options: string[];
  starting_equipment: InventoryEntry[];
  starting_gold_alt: number;
  subclass_start_level: number;
}

export interface Subclass {
  code: string;
  class_code: string;
  name_ru: string;
  description_ru: string;
}

export interface Background {
  code: string;
  name_ru: string;
  description_ru: string;
  ability_scores: string[];
  granted_skills: string[];
  feat_code: string;
  starting_equipment: InventoryEntry[];
  starting_gold_alt: number;
}

export type FeatCategory = "origin" | "general" | "fighting_style";

export interface Feat {
  code: string;
  name_ru: string;
  description_ru: string;
  category: FeatCategory;
  prerequisites_ru: string | null;
  is_repeatable: boolean;
}

export type ItemType =
  | "weapon"
  | "armor"
  | "ammunition"
  | "gear"
  | "kit"
  | "tool"
  | "currency";

export interface Item {
  code: string;
  name_ru: string;
  description_ru: string;
  type: ItemType;
  cost_gp: number | null;
}
