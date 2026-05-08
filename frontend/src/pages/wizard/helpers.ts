import { ABILITY_ORDER, MAX_LEVEL, REQUIRED_LANGUAGE_COUNT, STANDARD_ARRAY } from "@/lib/dnd";
import type { Background, CharacterClass, InventoryEntry } from "@/types/reference";

import type { DraftState, EquipChoice } from "./types";

/** Merge two inventory lists, summing qty for duplicate codes. */
export function mergeInventory(
  a: InventoryEntry[],
  b: InventoryEntry[],
): InventoryEntry[] {
  const map = new Map<string, number>();
  for (const e of [...a, ...b]) {
    map.set(e.code, (map.get(e.code) ?? 0) + e.qty);
  }
  return Array.from(map, ([code, qty]) => ({ code, qty }));
}

/** Compute final items + gold from class/bg + per-source choices. */
export function computeEquipment(
  cls: CharacterClass | null,
  bg: Background | null,
  classChoice: EquipChoice,
  bgChoice: EquipChoice,
): { items: InventoryEntry[]; gold: number } {
  const classItems = cls && classChoice === "set" ? cls.starting_equipment : [];
  const bgItems = bg && bgChoice === "set" ? bg.starting_equipment : [];
  const classGold = cls && classChoice === "gold" ? cls.starting_gold_alt : 0;
  const bgGold = bg && bgChoice === "gold" ? bg.starting_gold_alt : 0;
  return {
    items: mergeInventory(classItems, bgItems),
    gold: classGold + bgGold,
  };
}

/** Per-step validation. Mirrors the order of `STEPS`. */
export function isStepValid(
  step: number,
  draft: DraftState,
  cls: CharacterClass | null,
  bg: Background | null,
): boolean {
  switch (step) {
    case 0: {
      if (!draft.class_code || !cls) return false;
      if (draft.level < 1 || draft.level > MAX_LEVEL) return false;
      if (draft.level >= cls.subclass_start_level && !draft.subclass_code) return false;
      return true;
    }
    case 1:
      return !!draft.background_code;
    case 2:
      return !!draft.race_code && !!draft.gender;
    case 3:
      return (
        draft.languages.length === REQUIRED_LANGUAGE_COUNT &&
        draft.languages.includes("common")
      );
    case 4:
      return !!draft.alignment;
    case 5: {
      const allFilled = ABILITY_ORDER.every(
        (a) => draft.ability_scores[a] !== undefined,
      );
      const sorted = ABILITY_ORDER.map((a) => draft.ability_scores[a]).sort(
        (a, b) => a! - b!,
      );
      const isStandardArray =
        JSON.stringify(sorted) ===
        JSON.stringify([...STANDARD_ARRAY].sort((a, b) => a - b));
      const total = Object.values(draft.background_bonuses).reduce<number>(
        (s, v) => s + (v ?? 0),
        0,
      );
      const validBonus =
        total === 3 &&
        bg !== null &&
        Object.keys(draft.background_bonuses).every((k) =>
          (bg.ability_scores as string[]).includes(k),
        );
      return allFilled && isStandardArray && validBonus;
    }
    case 6:
      return cls !== null && draft.chosen_skills.length === cls.skill_choices_count;
    case 7:
      return bg !== null && (!bg.feat_code || draft.feats.includes(bg.feat_code));
    case 8:
      return true;
    case 9:
      return draft.name.trim().length > 0;
    default:
      return false;
  }
}
