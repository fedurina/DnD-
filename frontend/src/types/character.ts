export type AbilityCode = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type Alignment =
  | "lawful_good" | "neutral_good" | "chaotic_good"
  | "lawful_neutral" | "neutral" | "chaotic_neutral"
  | "lawful_evil" | "neutral_evil" | "chaotic_evil";

export type AbilityScores = Record<AbilityCode, number>;

export interface CharacterCreatePayload {
  name: string;
  alignment: Alignment;
  race_code: string;
  class_code: string;
  background_code: string;
  ability_scores: AbilityScores;
  background_bonuses: Partial<Record<AbilityCode, number>>;
  chosen_skills: string[];
}

export interface CharacterCampaignBrief {
  id: string;
  name: string;
  needs_attention: boolean;
}

export interface Character extends CharacterCreatePayload {
  id: string;
  user_id: string;
  level: number;
  is_archived: boolean;
  campaigns: CharacterCampaignBrief[];
  created_at: string;
  updated_at: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  race_code: string;
  class_code: string;
  background_code: string;
  is_archived: boolean;
  campaigns: CharacterCampaignBrief[];
  created_at: string;
}

export interface CharacterUpdatePayload {
  name?: string;
  alignment?: Alignment;
}
