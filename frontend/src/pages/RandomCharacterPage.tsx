import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { charactersApi } from "@/api/characters";
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
import { byCode } from "@/lib/refs";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type {
  AbilityCode,
  AbilityScores,
  CharacterCreatePayload,
} from "@/types/character";

import { computeEquipment } from "./wizard/helpers";
import { randomDraft } from "./wizard/random";
import type { DraftState } from "./wizard/types";

export default function RandomCharacterPage() {
  const navigate = useNavigate();
  const refsStatus = useEnsureRefs();
  const refs = useRefsStore();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Первый бросок, как только справочники загрузятся.
  useEffect(() => {
    if (refsStatus !== "loaded" || draft !== null) return;
    setDraft(
      randomDraft({
        classes: refs.classes,
        races: refs.races,
        backgrounds: refs.backgrounds,
        subclasses: refs.subclasses,
        feats: refs.feats,
      }),
    );
  }, [refsStatus, draft, refs.classes, refs.races, refs.backgrounds, refs.subclasses]);

  const reroll = () => {
    setError(null);
    setDraft(
      randomDraft({
        classes: refs.classes,
        races: refs.races,
        backgrounds: refs.backgrounds,
        subclasses: refs.subclasses,
        feats: refs.feats,
      }),
    );
  };

  const onSave = async () => {
    if (!draft) return;
    setError(null);
    setSubmitting(true);
    try {
      const cls = refs.classes.find((c) => c.code === draft.class_code) ?? null;
      const bg = refs.backgrounds.find((b) => b.code === draft.background_code) ?? null;
      const { items, gold } = computeEquipment(cls, bg, draft.equip_class, draft.equip_bg);
      const needsSubclass =
        cls !== null && draft.level >= cls.subclass_start_level;
      const payload: CharacterCreatePayload = {
        name: draft.name,
        alignment: draft.alignment!,
        gender: draft.gender!,
        level: draft.level,
        race_code: draft.race_code!,
        class_code: draft.class_code!,
        subclass_code: needsSubclass ? draft.subclass_code : null,
        background_code: draft.background_code!,
        ability_scores: draft.ability_scores as AbilityScores,
        background_bonuses: draft.background_bonuses,
        chosen_skills: draft.chosen_skills,
        languages: draft.languages,
        feats: draft.feats,
        items,
        gold,
        equip_class_choice: draft.equip_class,
        equip_bg_choice: draft.equip_bg,
      };
      const created = await charactersApi.create(payload);
      navigate(`/characters/${created.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  if (refs.error) return <div className="alert alert-error">{refs.error}</div>;
  if (refsStatus !== "loaded" || !draft)
    return <p className="muted">Бросаем кубики…</p>;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>🎲 Случайный персонаж</h1>
          <p>Сгенерирован полностью случайно по правилам D&D 5.5e (2024).</p>
        </div>
      </header>

      <Preview draft={draft} />

      {error && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <div className="wizard-actions" style={{ marginTop: 20 }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/characters")}
          type="button"
          disabled={submitting}
        >
          Отмена
        </button>
        <div className="row">
          <button
            className="btn btn-secondary"
            onClick={reroll}
            type="button"
            disabled={submitting}
          >
            ↻ Сгенерировать заново
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            type="button"
            disabled={submitting}
          >
            {submitting ? "Сохраняем…" : "Сохранить персонажа"}
          </button>
        </div>
      </div>
    </>
  );
}

function Preview({ draft }: { draft: DraftState }) {
  const refs = useRefsStore();
  const skillByCode = useMemo(() => byCode(refs.skills), [refs.skills]);
  const featByCode = useMemo(() => byCode(refs.feats), [refs.feats]);
  const itemByCode = useMemo(() => byCode(refs.items), [refs.items]);

  const cls = refs.classes.find((c) => c.code === draft.class_code)!;
  const race = refs.races.find((r) => r.code === draft.race_code)!;
  const bg = refs.backgrounds.find((b) => b.code === draft.background_code)!;
  const subclass =
    refs.subclasses.find((s) => s.code === draft.subclass_code) ?? null;

  const final = applyBonuses(
    draft.ability_scores as AbilityScores,
    draft.background_bonuses,
  );
  const conMod = abilityModifier(final.con);
  const dexMod = abilityModifier(final.dex);
  const hp = hpAtLevel(cls.hit_die, conMod, draft.level);
  const ac = 10 + dexMod;
  const pb = proficiencyBonus(draft.level);

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
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title">{draft.name}</h2>
        <p className="card-subtitle">
          {race.name_ru} · {cls.name_ru}
          {subclass && <> ({subclass.name_ru})</>} · {draft.level} ур. ·{" "}
          {bg.name_ru} · {alignmentName}
        </p>
      </div>

      <div className="grid-cards">
        <article className="card card-compact">
          <div className="card-subtitle">Базовые параметры</div>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13.5 }}>
            <li>Уровень <b>{draft.level}</b></li>
            <li>Пол: <b>{genderName}</b></li>
            <li>Хиты: <b>{hp}</b> <span className="muted">(d{cls.hit_die} + {formatModifier(conMod)} ТЕЛ)</span></li>
            <li>КЗ без брони: <b>{ac}</b> <span className="muted">(10 + {formatModifier(dexMod)} ЛОВ)</span></li>
            <li>Бонус мастерства: <b>+{pb}</b></li>
            <li>Скорость: <b>{race.speed} фт</b></li>
          </ul>
        </article>

        <article className="card card-compact">
          <div className="card-subtitle">Характеристики</div>
          <table style={{ width: "100%", borderSpacing: 0, marginTop: 8, fontSize: 13.5 }}>
            <tbody>
              {ABILITY_ORDER.map((a) => {
                const score = final[a as AbilityCode];
                return (
                  <tr key={a}>
                    <td style={{ padding: "4px 0" }}>{ABILITY_NAMES_RU[a].full}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{score}</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)", paddingLeft: 8 }}>
                      {formatModifier(abilityModifier(score))}
                    </td>
                  </tr>
                );
              })}
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
          <div className="card-subtitle">Снаряжение</div>
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
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>—</p>
          )}
        </article>
      </div>
    </>
  );
}
