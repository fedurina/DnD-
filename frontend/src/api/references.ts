import { api } from "./client";
import type {
  Ability,
  Background,
  CharacterClass,
  Race,
  Skill,
} from "@/types/reference";

export const refsApi = {
  abilities: () => api.get<Ability[]>("/refs/abilities"),
  skills: () => api.get<Skill[]>("/refs/skills"),
  races: () => api.get<Race[]>("/refs/races"),
  classes: () => api.get<CharacterClass[]>("/refs/classes"),
  backgrounds: () => api.get<Background[]>("/refs/backgrounds"),
};
