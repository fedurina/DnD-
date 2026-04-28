import { api } from "./client";
import type {
  Campaign,
  CampaignCreatePayload,
  CampaignsResponse,
  CampaignUpdatePayload,
} from "@/types/campaign";

export const campaignsApi = {
  list: () => api.get<CampaignsResponse>("/campaigns", { auth: true }),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`, { auth: true }),
  create: (payload: CampaignCreatePayload) =>
    api.post<Campaign>("/campaigns", payload, { auth: true }),
  update: (id: string, payload: CampaignUpdatePayload) =>
    api.patch<Campaign>(`/campaigns/${id}`, payload, { auth: true }),
  delete: (id: string) => api.delete<void>(`/campaigns/${id}`, { auth: true }),
  regenerateInvite: (id: string) =>
    api.post<Campaign>(`/campaigns/${id}/regenerate-invite`, undefined, { auth: true }),
  join: (invite_code: string, character_id?: string) =>
    api.post<Campaign>(
      "/campaigns/join",
      { invite_code, character_id: character_id ?? null },
      { auth: true },
    ),
  leave: (id: string) =>
    api.post<void>(`/campaigns/${id}/leave`, undefined, { auth: true }),
  attachCharacter: (id: string, character_id: string | null) =>
    api.patch<void>(`/campaigns/${id}/character`, { character_id }, { auth: true }),
  kickMember: (id: string, user_id: string) =>
    api.delete<void>(`/campaigns/${id}/members/${user_id}`, { auth: true }),
};
