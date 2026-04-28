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

export interface CharacterClass {
  code: string;
  name_ru: string;
  description_ru: string;
  hit_die: number;
  primary_abilities: string[];
  saving_throw_abilities: string[];
  skill_choices_count: number;
  skill_options: string[];
}

export interface Background {
  code: string;
  name_ru: string;
  description_ru: string;
  ability_scores: string[];
  granted_skills: string[];
  feat_ru: string;
}
