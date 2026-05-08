import { useEffect } from "react";
import { create } from "zustand";
import { refsApi } from "@/api/references";
import type {
  Ability,
  Background,
  CharacterClass,
  Feat,
  Item,
  Race,
  Skill,
  Subclass,
} from "@/types/reference";

type Status = "idle" | "loading" | "loaded" | "error";

interface RefsState {
  abilities: Ability[];
  skills: Skill[];
  races: Race[];
  classes: CharacterClass[];
  backgrounds: Background[];
  feats: Feat[];
  items: Item[];
  subclasses: Subclass[];
  status: Status;
  error: string | null;
  load: () => Promise<void>;
}

export const useRefsStore = create<RefsState>((set, get) => ({
  abilities: [],
  skills: [],
  races: [],
  classes: [],
  backgrounds: [],
  feats: [],
  items: [],
  subclasses: [],
  status: "idle",
  error: null,
  load: async () => {
    const status = get().status;
    if (status === "loaded" || status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const [
        abilities,
        skills,
        races,
        classes,
        backgrounds,
        feats,
        items,
        subclasses,
      ] = await Promise.all([
        refsApi.abilities(),
        refsApi.skills(),
        refsApi.races(),
        refsApi.classes(),
        refsApi.backgrounds(),
        refsApi.feats(),
        refsApi.items(),
        refsApi.subclasses(),
      ]);
      set({
        abilities,
        skills,
        races,
        classes,
        backgrounds,
        feats,
        items,
        subclasses,
        status: "loaded",
      });
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : "Ошибка загрузки",
      });
    }
  },
}));

/**
 * Triggers a one-shot load of D&D reference data on mount.
 * Returns the current load status so callers can render fallbacks.
 */
export function useEnsureRefs(): Status {
  const status = useRefsStore((s) => s.status);
  const load = useRefsStore((s) => s.load);
  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);
  return status;
}
