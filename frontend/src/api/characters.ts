import { api } from "./client";
import type {
  Character,
  CharacterCreatePayload,
  CharacterSummary,
  CharacterUpdatePayload,
} from "@/types/character";

export const charactersApi = {
  list: (includeArchived = false) =>
    api.get<CharacterSummary[]>(
      `/characters?include_archived=${includeArchived}`,
      { auth: true },
    ),
  get: (id: string) => api.get<Character>(`/characters/${id}`, { auth: true }),
  create: (payload: CharacterCreatePayload) =>
    api.post<Character>("/characters", payload, { auth: true }),
  update: (id: string, payload: CharacterUpdatePayload) =>
    api.patch<Character>(`/characters/${id}`, payload, { auth: true }),
  archive: (id: string) =>
    api.post<Character>(`/characters/${id}/archive`, undefined, { auth: true }),
  unarchive: (id: string) =>
    api.post<Character>(`/characters/${id}/unarchive`, undefined, { auth: true }),
  delete: (id: string) => api.delete<void>(`/characters/${id}`, { auth: true }),
};
