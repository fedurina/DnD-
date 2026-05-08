import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  ALIGNMENT_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  abilityModifier,
  applyBonuses,
  formatModifier,
  hpAtLevel,
  proficiencyBonus,
} from "@/lib/dnd";
import type { AbilityScores } from "@/types/character";
import type {
  Background,
  CharacterClass,
  Feat,
  Item,
  Race,
  Skill,
  Subclass,
} from "@/types/reference";

import { computeEquipment } from "../helpers";
import type { DraftState } from "../types";

export function SummaryStep({
  draft,
  race,
  cls,
  bg,
  subclasses,
  skillByCode,
  featByCode,
  itemByCode,
  onName,
}: {
  draft: DraftState;
  race: Race;
  cls: CharacterClass;
  bg: Background;
  subclasses: Subclass[];
  skillByCode: Record<string, Skill>;
  featByCode: Record<string, Feat>;
  itemByCode: Record<string, Item>;
  onName: (v: string) => void;
}) {
  const final = applyBonuses(
    draft.ability_scores as AbilityScores,
    draft.background_bonuses,
  );
  const conMod = abilityModifier(final.con);
  const dexMod = abilityModifier(final.dex);
  const hp = hpAtLevel(cls.hit_die, conMod, draft.level);
  const ac = 10 + dexMod;
  const pb = proficiencyBonus(draft.level);
  const subclass = subclasses.find((s) => s.code === draft.subclass_code) ?? null;

  const allSkills = Array.from(
    new Set([...bg.granted_skills, ...draft.chosen_skills]),
  );

  const alignmentName =
    ALIGNMENT_OPTIONS.find((a) => a.code === draft.alignment)?.name_ru ?? "—";
  const genderName =
    GENDER_OPTIONS.find((g) => g.code === draft.gender)?.name_ru ?? "—";
  const langNames = draft.languages
    .map((c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.name_ru ?? c)
    .join(", ");

  const { items, gold } = computeEquipment(cls, bg, draft.equip_class, draft.equip_bg);

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Итоговая информация</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Дайте имя персонажу и проверьте сводку.
      </p>

      <div className="form" style={{ maxWidth: 480, marginBottom: 24 }}>
        <div className="field">
          <label className="label" htmlFor="char-name">Имя</label>
          <input
            id="char-name"
            className="input"
            value={draft.name}
            onChange={(e) => onName(e.target.value)}
            placeholder="например, Лиэлла"
            maxLength={64}
            required
          />
        </div>
      </div>

      <div className="grid-cards">
        <article className="card card-compact">
          <div className="card-subtitle">Базовые параметры</div>
          <h3 className="card-title">{cls.name_ru} · {race.name_ru}</h3>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13.5 }}>
            <li>Уровень <b>{draft.level}</b></li>
            {subclass && <li>Архетип: <b>{subclass.name_ru}</b></li>}
            <li>Пол: <b>{genderName}</b></li>
            <li>Мировоззрение: <b>{alignmentName}</b></li>
            <li>
              Хиты на {draft.level} уровне: <b>{hp}</b>{" "}
              <span className="muted">(d{cls.hit_die} + {formatModifier(conMod)} ТЕЛ)</span>
            </li>
            <li>КЗ без брони: <b>{ac}</b> <span className="muted">(10 + {formatModifier(dexMod)} ЛОВ)</span></li>
            <li>Бонус мастерства: <b>+{pb}</b></li>
            <li>Скорость: <b>{race.speed} фт</b></li>
            <li>Предыстория: <b>{bg.name_ru}</b></li>
          </ul>
        </article>

        <article className="card card-compact">
          <div className="card-subtitle">Характеристики</div>
          <table style={{ width: "100%", borderSpacing: 0, marginTop: 8, fontSize: 13.5 }}>
            <tbody>
              {ABILITY_ORDER.map((a) => (
                <tr key={a}>
                  <td style={{ padding: "4px 0" }}>{ABILITY_NAMES_RU[a].full}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{final[a]}</td>
                  <td style={{ textAlign: "right", color: "var(--text-muted)", paddingLeft: 8 }}>
                    {formatModifier(abilityModifier(final[a]))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card card-compact">
          <div className="card-subtitle">Навыки</div>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13.5 }}>
            {allSkills.map((s) => (
              <li key={s}>{skillByCode[s]?.name_ru ?? s}</li>
            ))}
          </ul>
        </article>

        <article className="card card-compact">
          <div className="card-subtitle">Языки</div>
          <p style={{ marginTop: 8, fontSize: 13.5 }}>{langNames}</p>
        </article>

        <article className="card card-compact">
          <div className="card-subtitle">Черты</div>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13.5 }}>
            {draft.feats.length === 0 && <li className="muted">—</li>}
            {draft.feats.map((c) => (
              <li key={c}>{featByCode[c]?.name_ru ?? c}</li>
            ))}
          </ul>
        </article>

        <article className="card card-compact">
          <div className="card-subtitle">Снаряжение и золото</div>
          <p style={{ fontSize: 13.5, marginTop: 8 }}>
            <b>Золото:</b> {gold} зм
          </p>
          {items.length > 0 ? (
            <ul style={{ marginTop: 4, paddingLeft: 18, fontSize: 13.5 }}>
              {items.map((it) => (
                <li key={it.code}>
                  {itemByCode[it.code]?.name_ru ?? it.code}
                  {it.qty > 1 && <span className="muted"> × {it.qty}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
              Без предметов в инвентаре.
            </p>
          )}
        </article>
      </div>
    </>
  );
}
