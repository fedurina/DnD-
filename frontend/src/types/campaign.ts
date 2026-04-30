export interface CampaignSummary {
  id: string;
  master_id: string;
  master_username: string;
  name: string;
  max_level: number;
  is_active: boolean;
  member_count: number;
  my_character_id: string | null;
  needs_attention: boolean;
  created_at: string;
}

export interface CampaignsResponse {
  owned: CampaignSummary[];
  joined: CampaignSummary[];
}

export interface CampaignMember {
  user_id: string;
  username: string;
  character_id: string | null;
  character_name: string | null;
  needs_attention: boolean;
  joined_at: string;
}

export interface Campaign {
  id: string;
  master_id: string;
  master_username: string;
  name: string;
  description: string;
  invite_code: string; // empty string for non-master viewers
  allowed_races: string[];
  allowed_classes: string[];
  max_level: number;
  is_active: boolean;
  members: CampaignMember[];
  created_at: string;
  updated_at: string;
}

export interface CampaignCreatePayload {
  name: string;
  description?: string;
  allowed_races?: string[];
  allowed_classes?: string[];
  max_level?: number;
}

export interface CampaignUpdatePayload {
  name?: string;
  description?: string;
  allowed_races?: string[];
  allowed_classes?: string[];
  max_level?: number;
  is_active?: boolean;
}
