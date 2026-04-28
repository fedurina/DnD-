import { useEffect } from "react";
import { create } from "zustand";
import { refsApi } from "@/api/references";
import type {
  Ability,
  Background,
  CharacterClass,
  Race,
  Skill,
} from "@/types/reference";

type Status = "idle" | "loading" | "loaded" | "error";

interface RefsState {
  abilities: Ability[];
  skills: Skill[];
  races: Race[];
  classes: CharacterClass[];
  backgrounds: Background[];
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
  status: "idle",
  error: null,
  load: async () => {
    const status = get().status;
    if (status === "loaded" || status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const [abilities, skills, races, classes, backgrounds] = await Promise.all([
        refsApi.abilities(),
        refsApi.skills(),
        refsApi.races(),
        refsApi.classes(),
        refsApi.backgrounds(),
      ]);
      set({ abilities, skills, races, classes, backgrounds, status: "loaded" });
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
