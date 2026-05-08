import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  ALIGNMENT_OPTIONS,
  GENDER_OPTIONS,
  REQUIRED_LANGUAGE_COUNT,
  abilityModifier,
  applyBonuses,
  formatModifier,
  hpAtLevel,
  proficiencyBonus,
} from "@/lib/dnd";
import type { AbilityScores } from "@/types/character";
import type { Background, CharacterClass, Race, Subclass } from "@/types/reference";

import { computeEquipment } from "./helpers";
import type { DraftState } from "./types";

export function LivePreview({
  draft,
  race,
  cls,
  bg,
  subclasses,
}: {
  draft: DraftState;
  race: Race | null;
  cls: CharacterClass | null;
  bg: Background | null;
  subclasses: Subclass[];
}) {
  const allFilled = ABILITY_ORDER.every((a) => draft.ability_scores[a] !== undefined);
  const final = allFilled
    ? applyBonuses(draft.ability_scores as AbilityScores, draft.background_bonuses)
    : null;
  const conMod = final ? abilityModifier(final.con) : null;
  const dexMod = final ? abilityModifier(final.dex) : null;
  const hp = cls ? hpAtLevel(cls.hit_die, conMod ?? 0, draft.level) : null;
  const ac = dexMod !== null ? 10 + dexMod : null;
  const alignmentName = ALIGNMENT_OPTIONS.find((a) => a.code === draft.alignment)?.name_ru;
  const genderName = GENDER_OPTIONS.find((g) => g.code === draft.gender)?.name_ru;
  const subclassName = subclasses.find((s) => s.code === draft.subclass_code)?.name_ru;

  return (
    <aside className="wizard-preview">
      <div className="wizard-preview-title">Текущее состояние</div>

      <PreviewRow label="Класс" value={cls?.name_ru} />
      <PreviewRow label="Уровень" value={String(draft.level)} />
      <PreviewRow label="Архетип" value={subclassName} />
      <PreviewRow label="Предыстория" value={bg?.name_ru} />
      <PreviewRow label="Раса" value={race?.name_ru} />
      <PreviewRow label="Пол" value={genderName} />
      <PreviewRow label="Мировоззрение" value={alignmentName} />
      <PreviewRow
        label="Языков"
        value={`${draft.languages.length} / ${REQUIRED_LANGUAGE_COUNT}`}
      />
      <PreviewRow
        label="Черт"
        value={draft.feats.length > 0 ? String(draft.feats.length) : undefined}
      />

      {final && (
        <>
          <div className="wizard-preview-divider" />
          <div className="wizard-preview-stats">
            {ABILITY_ORDER.map((a) => (
              <div key={a} className="wizard-preview-stat">
                <span className="wizard-preview-stat-label">{ABILITY_NAMES_RU[a].short}</span>
                <span className="wizard-preview-stat-value">{final[a]}</span>
                <span className="wizard-preview-stat-mod">
                  {formatModifier(abilityModifier(final[a]))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {(hp !== null || ac !== null) && (
        <>
          <div className="wizard-preview-divider" />
          <PreviewRow
            label={`Хиты (${draft.level} ур.)`}
            value={hp !== null ? String(hp) : undefined}
          />
          <PreviewRow label="КЗ без брони" value={ac !== null ? String(ac) : undefined} />
          <PreviewRow
            label="Бонус мастерства"
            value={`+${proficiencyBonus(draft.level)}`}
          />
          <PreviewRow label="Скорость" value={race ? `${race.speed} фт` : undefined} />
        </>
      )}

      {(cls || bg) && (
        <>
          <div className="wizard-preview-divider" />
          {(() => {
            const { items, gold } = computeEquipment(cls, bg, draft.equip_class, draft.equip_bg);
            return (
              <>
                <PreviewRow label="Золото" value={`${gold} зм`} />
                <PreviewRow
                  label="Предметов"
                  value={items.length > 0 ? String(items.length) : undefined}
                />
              </>
            );
          })()}
        </>
      )}
    </aside>
  );
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="wizard-preview-row">
      <span className="wizard-preview-label">{label}</span>
      <span className={"wizard-preview-value" + (value ? "" : " is-empty")}>
        {value ?? "—"}
      </span>
    </div>
  );
}
