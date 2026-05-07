import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { campaignsApi } from "@/api/campaigns";
import { charactersApi } from "@/api/characters";
import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  ALIGNMENT_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  REQUIRED_LANGUAGE_COUNT,
  STANDARD_ARRAY,
  abilityModifier,
  applyBonuses,
  formatModifier,
} from "@/lib/dnd";
import { byCode } from "@/lib/refs";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { Campaign } from "@/types/campaign";
import type {
  AbilityCode,
  AbilityScores,
  Alignment,
  CharacterCreatePayload,
  Gender,
  LanguageCode,
} from "@/types/character";
import type {
  Ability,
  Background,
  CharacterClass,
  Feat,
  FeatCategory,
  InventoryEntry,
  Item,
  Race,
  Skill,
} from "@/types/reference";

const STEPS = [
  "Класс",
  "Предыстория",
  "Раса",
  "Язык",
  "Мировоззрение",
  "Характеристики",
  "Навыки",
  "Черты",
  "Снаряжение",
  "Итог",
];

type EquipChoice = "set" | "gold";

interface DraftState {
  class_code: string | null;
  background_code: string | null;
  race_code: string | null;
  gender: Gender | null;
  languages: LanguageCode[];
  alignment: Alignment | null;
  ability_scores: Partial<Record<AbilityCode, number>>;
  background_bonuses: Partial<Record<AbilityCode, number>>;
  chosen_skills: string[];
  feats: string[];
  equip_class: EquipChoice;
  equip_bg: EquipChoice;
  name: string;
}

const initialDraft: DraftState = {
  class_code: null,
  background_code: null,
  race_code: null,
  gender: null,
  languages: ["common"],
  alignment: null,
  ability_scores: {},
  background_bonuses: {},
  chosen_skills: [],
  feats: [],
  equip_class: "set",
  equip_bg: "set",
  name: "",
};

/** Merge two inventory lists, summing qty for duplicate codes. */
function mergeInventory(a: InventoryEntry[], b: InventoryEntry[]): InventoryEntry[] {
  const map = new Map<string, number>();
  for (const e of [...a, ...b]) {
    map.set(e.code, (map.get(e.code) ?? 0) + e.qty);
  }
  return Array.from(map, ([code, qty]) => ({ code, qty }));
}

/** Compute final items + gold from class/bg + choices. */
function computeEquipment(
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

export default function CharacterWizardPage() {
  const navigate = useNavigate();
  const { id: editingId } = useParams<{ id: string }>();
  const isEdit = !!editingId;

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [draftLoaded, setDraftLoaded] = useState(!isEdit);
  const refsStatus = useEnsureRefs();
  const refs = useRefsStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchParams] = useSearchParams();
  const campaignId = isEdit ? null : searchParams.get("campaign");
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null);
      return;
    }
    campaignsApi
      .get(campaignId)
      .then(setCampaign)
      .catch(() => setCampaign(null));
  }, [campaignId]);

  useEffect(() => {
    if (!editingId) return;
    charactersApi
      .get(editingId)
      .then((c) => {
        setDraft({
          class_code: c.class_code,
          background_code: c.background_code,
          race_code: c.race_code,
          gender: c.gender,
          languages: c.languages,
          alignment: c.alignment,
          ability_scores: c.ability_scores,
          background_bonuses: c.background_bonuses,
          chosen_skills: c.chosen_skills,
          feats: c.feats,
          equip_class: c.equip_class_choice,
          equip_bg: c.equip_bg_choice,
          name: c.name,
        });
        setDraftLoaded(true);
      })
      .catch((e) =>
        setSubmitError(e instanceof ApiError ? e.message : "Не удалось загрузить персонажа"),
      );
  }, [editingId]);

  const eligibleRaces = useMemo(() => {
    if (isEdit || !campaign || campaign.allowed_races.length === 0) return refs.races;
    return refs.races.filter((r) => campaign.allowed_races.includes(r.code));
  }, [refs.races, campaign, isEdit]);

  const eligibleClasses = useMemo(() => {
    if (isEdit || !campaign || campaign.allowed_classes.length === 0) return refs.classes;
    return refs.classes.filter((c) => campaign.allowed_classes.includes(c.code));
  }, [refs.classes, campaign, isEdit]);

  const update = (patch: Partial<DraftState>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const selectedClass = useMemo(
    () => refs.classes.find((c) => c.code === draft.class_code) ?? null,
    [refs.classes, draft.class_code],
  );
  const selectedBackground = useMemo(
    () => refs.backgrounds.find((b) => b.code === draft.background_code) ?? null,
    [refs.backgrounds, draft.background_code],
  );
  const selectedRace = useMemo(
    () => refs.races.find((r) => r.code === draft.race_code) ?? null,
    [refs.races, draft.race_code],
  );

  const stepValid = useMemo(
    () => isStepValid(step, draft, selectedClass, selectedBackground),
    [step, draft, selectedClass, selectedBackground],
  );

  const isLast = step === STEPS.length - 1;

  const onNext = () => {
    if (!stepValid) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const onBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { items, gold } = computeEquipment(
        selectedClass,
        selectedBackground,
        draft.equip_class,
        draft.equip_bg,
      );
      const payload: CharacterCreatePayload = {
        name: draft.name.trim(),
        alignment: draft.alignment!,
        gender: draft.gender!,
        race_code: draft.race_code!,
        class_code: draft.class_code!,
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

      if (isEdit && editingId) {
        await charactersApi.update(editingId, payload);
        navigate(`/characters/${editingId}`, { replace: true });
        return;
      }

      const created = await charactersApi.create(payload);
      if (campaignId && campaign) {
        try {
          await campaignsApi.attachCharacter(campaignId, created.id);
          navigate(`/campaigns/${campaignId}`, { replace: true });
          return;
        } catch (attachErr) {
          setSubmitError(
            attachErr instanceof ApiError
              ? `Персонаж создан, но не удалось привязать к кампании: ${attachErr.message}`
              : "Персонаж создан, но не удалось привязать к кампании",
          );
          return;
        }
      }
      navigate(`/characters`, { replace: true, state: { highlightId: created.id } });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSubmitting(false);
    }
  };

  if (refs.error) return <div className="alert alert-error">{refs.error}</div>;
  if (refsStatus !== "loaded") return <p className="muted">Загрузка справочников…</p>;
  if (isEdit && !draftLoaded) return <p className="muted">Загрузка персонажа…</p>;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{isEdit ? "Редактирование персонажа" : "Создание персонажа"}</h1>
          <p>D&D 5.5e (2024). Шаг {step + 1} из {STEPS.length}: {STEPS[step]}</p>
        </div>
      </header>

      {campaign && !isEdit && (
        <div className="alert" style={{ marginBottom: 20 }}>
          Создание персонажа для кампании <b>«{campaign.name}»</b>. Выбор ограничен расами
          и классами, разрешёнными мастером. После создания персонаж будет автоматически
          привязан к кампании.
        </div>
      )}

      {isEdit && (
        <div className="alert" style={{ marginBottom: 20 }}>
          Редактирование изменит лист персонажа. Если персонаж привязан к кампаниям с
          ограничениями, новые значения должны им соответствовать — иначе сохранение
          будет отклонено.
        </div>
      )}

      <Stepper step={step} />

      <div className="wizard-layout">
        <div className="card">
          {step === 0 && (
            <ClassStep
              classes={eligibleClasses}
              abilityByCode={byCode(refs.abilities)}
              value={draft.class_code}
              onChange={(code) =>
                update({ class_code: code, chosen_skills: [] })
              }
            />
          )}
          {step === 1 && (
            <BackgroundStep
              backgrounds={refs.backgrounds}
              skillByCode={byCode(refs.skills)}
              abilityByCode={byCode(refs.abilities)}
              featByCode={byCode(refs.feats)}
              value={draft.background_code}
              onChange={(code) => {
                const bg = refs.backgrounds.find((b) => b.code === code);
                update({
                  background_code: code,
                  background_bonuses: {},
                  chosen_skills: [],
                  // Reset feats to just the new bg's origin feat.
                  feats: bg?.feat_code ? [bg.feat_code] : [],
                });
              }}
            />
          )}
          {step === 2 && (
            <RaceStep
              races={eligibleRaces}
              raceValue={draft.race_code}
              genderValue={draft.gender}
              onRaceChange={(code) => update({ race_code: code })}
              onGenderChange={(g) => update({ gender: g })}
            />
          )}
          {step === 3 && (
            <LanguageStep
              value={draft.languages}
              onChange={(langs) => update({ languages: langs })}
            />
          )}
          {step === 4 && (
            <AlignmentStep
              value={draft.alignment}
              onChange={(a) => update({ alignment: a })}
            />
          )}
          {step === 5 && (
            <AbilitiesStep
              base={draft.ability_scores}
              bonuses={draft.background_bonuses}
              background={selectedBackground!}
              onBaseChange={(v) => update({ ability_scores: v })}
              onBonusesChange={(v) => update({ background_bonuses: v })}
            />
          )}
          {step === 6 && (
            <SkillsStep
              cls={selectedClass!}
              background={selectedBackground!}
              skillByCode={byCode(refs.skills)}
              value={draft.chosen_skills}
              onChange={(v) => update({ chosen_skills: v })}
            />
          )}
          {step === 7 && (
            <FeatsStep
              feats={refs.feats}
              bg={selectedBackground!}
              value={draft.feats}
              onChange={(v) => update({ feats: v })}
            />
          )}
          {step === 8 && (
            <EquipmentStep
              cls={selectedClass!}
              bg={selectedBackground!}
              itemByCode={byCode(refs.items)}
              classChoice={draft.equip_class}
              bgChoice={draft.equip_bg}
              onClassChoice={(c) => update({ equip_class: c })}
              onBgChoice={(c) => update({ equip_bg: c })}
            />
          )}
          {step === 9 && (
            <SummaryStep
              draft={draft}
              race={selectedRace!}
              cls={selectedClass!}
              bg={selectedBackground!}
              skillByCode={byCode(refs.skills)}
              featByCode={byCode(refs.feats)}
              itemByCode={byCode(refs.items)}
              onName={(name) => update({ name })}
            />
          )}
        </div>

        <LivePreview
          draft={draft}
          race={selectedRace}
          cls={selectedClass}
          bg={selectedBackground}
        />
      </div>

      {submitError && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {submitError}
        </div>
      )}

      <div className="wizard-actions">
        <button
          className="btn btn-secondary"
          onClick={() =>
            navigate(isEdit && editingId ? `/characters/${editingId}` : "/characters")
          }
          type="button"
        >
          Отмена
        </button>
        <div className="row">
          <button
            className="btn btn-secondary"
            onClick={onBack}
            disabled={step === 0}
            type="button"
          >
            Назад
          </button>
          {!isLast ? (
            <button
              className="btn btn-primary"
              onClick={onNext}
              disabled={!stepValid}
              type="button"
            >
              Далее
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={!stepValid || submitting}
              type="button"
            >
              {submitting
                ? "Сохраняем…"
                : isEdit
                  ? "Сохранить изменения"
                  : "Создать персонажа"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Stepper ---------------- */

function Stepper({ step }: { step: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const cls =
          i === step ? "stepper-step is-active" : i < step ? "stepper-step is-done" : "stepper-step";
        return (
          <div key={label} className={cls}>
            <span className="stepper-step-num">{i + 1}</span>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Step: Class ---------------- */

function ClassStep({
  classes,
  abilityByCode,
  value,
  onChange,
}: {
  classes: CharacterClass[];
  abilityByCode: Record<string, Ability>;
  value: string | null;
  onChange: (code: string) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите класс</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Класс определяет способности и стиль игры персонажа.
      </p>
      <div className="select-grid">
        {classes.map((c) => (
          <button
            key={c.code}
            className={`select-card${value === c.code ? " is-selected" : ""}`}
            onClick={() => onChange(c.code)}
            type="button"
          >
            <div className="select-card-title">{c.name_ru}</div>
            <div className="select-card-subtitle">
              d{c.hit_die} · Основа:{" "}
              {c.primary_abilities.map((a) => abilityByCode[a]?.short_ru ?? a).join(", ")}
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              {c.description_ru}
            </p>
            <div style={{ fontSize: 12.5 }} className="muted">
              Спасброски:{" "}
              {c.saving_throw_abilities.map((a) => abilityByCode[a]?.name_ru ?? a).join(", ")}
              <br />
              Выбор навыков: {c.skill_choices_count}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Step: Background ---------------- */

function BackgroundStep({
  backgrounds,
  skillByCode,
  abilityByCode,
  featByCode,
  value,
  onChange,
}: {
  backgrounds: Background[];
  skillByCode: Record<string, Skill>;
  abilityByCode: Record<string, Ability>;
  featByCode: Record<string, Feat>;
  value: string | null;
  onChange: (code: string) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите предысторию</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Предыстория определяет прошлое персонажа, даёт +3 к характеристикам, 2 навыка и черту.
      </p>
      <div className="select-grid">
        {backgrounds.map((b) => (
          <button
            key={b.code}
            className={`select-card${value === b.code ? " is-selected" : ""}`}
            onClick={() => onChange(b.code)}
            type="button"
          >
            <div className="select-card-title">{b.name_ru}</div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {b.description_ru}
            </p>
            <div style={{ fontSize: 12.5 }} className="muted">
              Бонусы: {b.ability_scores.map((a) => abilityByCode[a]?.name_ru ?? a).join(", ")}
              <br />
              Навыки: {b.granted_skills.map((s) => skillByCode[s]?.name_ru ?? s).join(", ")}
              <br />
              Черта: {featByCode[b.feat_code]?.name_ru ?? b.feat_code}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Step: Race ---------------- */

function RaceStep({
  races,
  raceValue,
  genderValue,
  onRaceChange,
  onGenderChange,
}: {
  races: Race[];
  raceValue: string | null;
  genderValue: Gender | null;
  onRaceChange: (code: string) => void;
  onGenderChange: (g: Gender) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите расу</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Раса определяет внешний вид персонажа и его врождённые способности.
      </p>

      <div className="card-section" style={{ marginBottom: 20 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>Пол персонажа</h3>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>
          Влияет на внешний вид и обращение.
        </p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {GENDER_OPTIONS.map((g) => (
            <label
              key={g.code}
              className={`skill-item${genderValue === g.code ? " is-selected" : ""}`}
              style={{ flex: "1 1 200px", cursor: "pointer" }}
            >
              <input
                type="radio"
                checked={genderValue === g.code}
                onChange={() => onGenderChange(g.code)}
              />
              <span><b>{g.name_ru}</b></span>
            </label>
          ))}
        </div>
      </div>

      <h3 className="card-title" style={{ marginBottom: 12 }}>Доступные расы</h3>
      <div className="select-grid">
        {races.map((r) => (
          <button
            key={r.code}
            className={`select-card${raceValue === r.code ? " is-selected" : ""}`}
            onClick={() => onRaceChange(r.code)}
            type="button"
          >
            <div className="select-card-title">{r.name_ru}</div>
            <div className="select-card-subtitle">
              {r.size === "small" ? "Маленький" : "Средний"} · {r.speed} фт
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {r.description_ru}
            </p>
            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12.5 }}>
              {r.traits.map((t) => (
                <li key={t.name_ru}>
                  <b>{t.name_ru}.</b> <span className="muted">{t.description_ru}</span>
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Step: Language ---------------- */

function LanguageStep({
  value,
  onChange,
}: {
  value: LanguageCode[];
  onChange: (v: LanguageCode[]) => void;
}) {
  const remaining = REQUIRED_LANGUAGE_COUNT - value.length;

  const toggle = (code: LanguageCode) => {
    if (code === "common") return; // common is locked
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (value.length < REQUIRED_LANGUAGE_COUNT) {
      onChange([...value, code]);
    }
  };

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выбор языков</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Общий язык выбран по умолчанию. Выберите ещё{" "}
        {REQUIRED_LANGUAGE_COUNT - 1} языка из списка стандартных.
      </p>

      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <span className="muted">Выбрано: </span>
        <b>{value.length}</b> / {REQUIRED_LANGUAGE_COUNT}
        {remaining > 0 && (
          <span className="muted">
            {" "}· осталось добавить {remaining}
          </span>
        )}
      </div>

      <div className="skill-list">
        {LANGUAGE_OPTIONS.map((l) => {
          const isSelected = value.includes(l.code);
          const isLocked = l.code === "common";
          const isFull = !isSelected && value.length >= REQUIRED_LANGUAGE_COUNT;
          return (
            <label
              key={l.code}
              className={
                "skill-item" +
                (isSelected ? " is-selected" : "") +
                (isFull || isLocked ? " is-disabled" : "")
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isFull || isLocked}
                onChange={() => toggle(l.code)}
              />
              <span>
                {l.name_ru}
                {isLocked && (
                  <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                    (по умолчанию)
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Step: Alignment ---------------- */

function AlignmentStep({
  value,
  onChange,
}: {
  value: Alignment | null;
  onChange: (a: Alignment) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите мировоззрение</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Мировоззрение представляет базовые моральные и этические взгляды персонажа
        на мир, закон, общество, добро и зло.
      </p>
      <div className="select-grid">
        {ALIGNMENT_OPTIONS.map((a) => (
          <button
            key={a.code}
            className={`select-card${value === a.code ? " is-selected" : ""}`}
            onClick={() => onChange(a.code)}
            type="button"
          >
            <div className="select-card-title">{a.name_ru}</div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
              {a.description_ru}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Step: Abilities + bg bonuses ---------------- */

type DistMode = "1+1+1" | "2+1";

function AbilitiesStep({
  base,
  bonuses,
  background,
  onBaseChange,
  onBonusesChange,
}: {
  base: Partial<Record<AbilityCode, number>>;
  bonuses: Partial<Record<AbilityCode, number>>;
  background: Background;
  onBaseChange: (v: Partial<Record<AbilityCode, number>>) => void;
  onBonusesChange: (v: Partial<Record<AbilityCode, number>>) => void;
}) {
  const initialMode: DistMode =
    Object.values(bonuses).some((v) => v === 2) ? "2+1" : "1+1+1";
  const [mode, setMode] = useState<DistMode>(initialMode);

  const remaining = STANDARD_ARRAY.filter((v) => {
    const count = STANDARD_ARRAY.filter((x) => x === v).length;
    const usedCount = Object.values(base).filter((u) => u === v).length;
    return usedCount < count;
  });

  const setBase = (ab: AbilityCode, val: number | "") => {
    const next = { ...base };
    if (val === "") delete next[ab];
    else next[ab] = val;
    onBaseChange(next);
  };

  const allChosen = ABILITY_ORDER.every((a) => base[a] !== undefined);

  const setMode2 = (m: DistMode) => {
    setMode(m);
    if (m === "1+1+1") {
      const next: Partial<Record<AbilityCode, number>> = {};
      for (const a of background.ability_scores as AbilityCode[]) next[a] = 1;
      onBonusesChange(next);
    } else {
      onBonusesChange({});
    }
  };

  useEffect(() => {
    if (Object.keys(bonuses).length === 0) setMode2("1+1+1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background.code]);

  const set2plus1 = (twoAb: AbilityCode, oneAb: AbilityCode) => {
    if (twoAb === oneAb) return;
    onBonusesChange({ [twoAb]: 2, [oneAb]: 1 });
  };

  const final = applyBonuses(
    Object.fromEntries(
      ABILITY_ORDER.map((a) => [a, base[a] ?? 0]),
    ) as AbilityScores,
    bonuses,
  );

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Характеристики</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Распределите Standard Array (15, 14, 13, 12, 10, 8) — каждое значение по разу.
      </p>

      <div className="ability-grid" style={{ marginBottom: 24 }}>
        {ABILITY_ORDER.map((a) => (
          <div className="ability-tile" key={a}>
            <div className="ability-tile-name">{ABILITY_NAMES_RU[a].full}</div>
            <select
              className="select"
              value={base[a] ?? ""}
              onChange={(e) =>
                setBase(a, e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">—</option>
              {STANDARD_ARRAY.map((v) => {
                const isCurrent = base[a] === v;
                const stillAvailable = remaining.includes(v) || isCurrent;
                return (
                  <option key={v} value={v} disabled={!stillAvailable}>
                    {v}
                  </option>
                );
              })}
            </select>
            {allChosen && (
              <>
                <div className="ability-tile-final">
                  {final[a]}
                  {bonuses[a] ? (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>
                      (+{bonuses[a]})
                    </span>
                  ) : null}
                </div>
                <div className="ability-tile-mod">
                  модификатор {formatModifier(abilityModifier(final[a]))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="card-section">
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          Бонус предыстории «{background.name_ru}» (+3)
        </h3>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>
          Доступные характеристики:{" "}
          {(background.ability_scores as AbilityCode[])
            .map((a) => ABILITY_NAMES_RU[a].full)
            .join(", ")}
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <ModeRadio
            checked={mode === "1+1+1"}
            label="+1 / +1 / +1"
            hint="по одному ко всем трём"
            onChange={() => setMode2("1+1+1")}
          />
          <ModeRadio
            checked={mode === "2+1"}
            label="+2 / +1"
            hint="к двум из трёх"
            onChange={() => setMode2("2+1")}
          />
        </div>

        {mode === "2+1" && (
          <TwoPlusOnePicker
            options={background.ability_scores as AbilityCode[]}
            current={bonuses}
            onChoose={set2plus1}
          />
        )}
      </div>
    </>
  );
}

function ModeRadio({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`skill-item${checked ? " is-selected" : ""}`}
      style={{ flex: 1, cursor: "pointer" }}
    >
      <input type="radio" checked={checked} onChange={onChange} />
      <span>
        <b>{label}</b> <span className="muted" style={{ marginLeft: 4 }}>· {hint}</span>
      </span>
    </label>
  );
}

function TwoPlusOnePicker({
  options,
  current,
  onChoose,
}: {
  options: AbilityCode[];
  current: Partial<Record<AbilityCode, number>>;
  onChoose: (twoAb: AbilityCode, oneAb: AbilityCode) => void;
}) {
  const twoAb = (Object.entries(current).find(([, v]) => v === 2)?.[0] ?? "") as
    | AbilityCode
    | "";
  const oneAb = (Object.entries(current).find(([, v]) => v === 1)?.[0] ?? "") as
    | AbilityCode
    | "";

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "1fr 1fr",
        maxWidth: 480,
      }}
    >
      <div className="field">
        <label className="label">+2 к</label>
        <select
          className="select"
          value={twoAb}
          onChange={(e) =>
            oneAb && e.target.value
              ? onChoose(e.target.value as AbilityCode, oneAb)
              : onChoose(e.target.value as AbilityCode, oneAb || options.find((o) => o !== e.target.value)!)
          }
        >
          <option value="">—</option>
          {options.map((a) => (
            <option key={a} value={a}>
              {ABILITY_NAMES_RU[a].full}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label">+1 к</label>
        <select
          className="select"
          value={oneAb}
          onChange={(e) =>
            twoAb && e.target.value
              ? onChoose(twoAb, e.target.value as AbilityCode)
              : onChoose(twoAb || options.find((o) => o !== e.target.value)!, e.target.value as AbilityCode)
          }
        >
          <option value="">—</option>
          {options
            .filter((a) => a !== twoAb)
            .map((a) => (
              <option key={a} value={a}>
                {ABILITY_NAMES_RU[a].full}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

/* ---------------- Step: Skills ---------------- */

function SkillsStep({
  cls,
  background,
  skillByCode,
  value,
  onChange,
}: {
  cls: CharacterClass;
  background: Background;
  skillByCode: Record<string, Skill>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const need = cls.skill_choices_count;
  const granted = new Set(background.granted_skills);
  const available = cls.skill_options.filter((s) => !granted.has(s));

  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else if (value.length < need) onChange([...value, code]);
  };

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Навыки</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Класс «{cls.name_ru}»: выберите {need}. Навыки от предыстории уже даны.
      </p>

      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <span className="muted">Выбрано: </span>
        <b>{value.length}</b> / {need}
      </div>

      {granted.size > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11.5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-faint)",
              marginBottom: 6,
            }}
          >
            От предыстории (автоматически)
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {Array.from(granted).map((s) => (
              <span key={s} className="badge">{skillByCode[s]?.name_ru ?? s}</span>
            ))}
          </div>
        </div>
      )}

      <div className="skill-list">
        {available.map((s) => {
          const isSelected = value.includes(s);
          const isFull = !isSelected && value.length >= need;
          return (
            <label
              key={s}
              className={
                "skill-item" +
                (isSelected ? " is-selected" : "") +
                (isFull ? " is-disabled" : "")
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isFull}
                onChange={() => toggle(s)}
              />
              <span>{skillByCode[s]?.name_ru ?? s}</span>
            </label>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Step: Summary ---------------- */

function SummaryStep({
  draft,
  race,
  cls,
  bg,
  skillByCode,
  featByCode,
  itemByCode,
  onName,
}: {
  draft: DraftState;
  race: Race;
  cls: CharacterClass;
  bg: Background;
  skillByCode: Record<string, Skill>;
  featByCode: Record<string, Feat>;
  itemByCode: Record<string, Item>;
  onName: (v: string) => void;
}) {
  const final = applyBonuses(draft.ability_scores as AbilityScores, draft.background_bonuses);
  const conMod = abilityModifier(final.con);
  const dexMod = abilityModifier(final.dex);
  const hp = cls.hit_die + conMod;
  const ac = 10 + dexMod;

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
            <li>Уровень <b>1</b></li>
            <li>Пол: <b>{genderName}</b></li>
            <li>Мировоззрение: <b>{alignmentName}</b></li>
            <li>Хиты на 1 уровне: <b>{hp}</b> <span className="muted">(d{cls.hit_die} + {formatModifier(conMod)} ТЕЛ)</span></li>
            <li>КЗ без брони: <b>{ac}</b> <span className="muted">(10 + {formatModifier(dexMod)} ЛОВ)</span></li>
            <li>Бонус мастерства: <b>+2</b></li>
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

/* ---------------- Step: Feats ---------------- */

const FEAT_CATEGORY_LABEL: Record<FeatCategory, string> = {
  origin: "Происхождения",
  general: "Общие",
  fighting_style: "Боевой стиль",
};

function FeatsStep({
  feats,
  bg,
  value,
  onChange,
}: {
  feats: Feat[];
  bg: Background;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  type Filter = "all" | FeatCategory;
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<"available" | "selected">("available");
  const [activeCode, setActiveCode] = useState<string | null>(value[0] ?? null);

  const filtered = useMemo(
    () => (filter === "all" ? feats : feats.filter((f) => f.category === filter)),
    [feats, filter],
  );

  const selectedFeats = feats.filter((f) => value.includes(f.code));
  const visibleList = tab === "selected" ? selectedFeats : filtered;
  const active = feats.find((f) => f.code === activeCode) ?? null;

  const toggle = (code: string) => {
    if (code === bg.feat_code) return; // origin feat is locked
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else onChange([...value, code]);
  };

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Черты</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Особые таланты и способности персонажа. Черта от предыстории добавлена
        автоматически.
      </p>

      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          className={"chip" + (tab === "available" ? " is-selected" : "")}
          onClick={() => setTab("available")}
        >
          Доступные ({filtered.length})
        </button>
        <button
          type="button"
          className={"chip" + (tab === "selected" ? " is-selected" : "")}
          onClick={() => setTab("selected")}
        >
          Выбранные ({value.length})
        </button>
      </div>

      {tab === "available" && (
        <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {(["all", "origin", "general", "fighting_style"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={"chip chip-sm" + (filter === f ? " is-selected" : "")}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Все" : FEAT_CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      <div className="feats-layout">
        <div className="feats-list">
          {visibleList.length === 0 && (
            <div className="muted" style={{ padding: 12 }}>—</div>
          )}
          {visibleList.map((f) => {
            const isSelected = value.includes(f.code);
            const isOrigin = f.code === bg.feat_code;
            const isActive = activeCode === f.code;
            return (
              <button
                key={f.code}
                type="button"
                onClick={() => setActiveCode(f.code)}
                onDoubleClick={() => toggle(f.code)}
                className={
                  "feat-row" +
                  (isSelected ? " is-selected" : "") +
                  (isActive ? " is-active" : "")
                }
              >
                <div className="feat-row-name">
                  {f.name_ru}
                  {isOrigin && (
                    <span className="badge" style={{ marginLeft: 8 }}>
                      Предыстория
                    </span>
                  )}
                </div>
                <div className="feat-row-prereq">
                  {f.prerequisites_ru ?? "Нет требований"}
                </div>
              </button>
            );
          })}
        </div>

        {active && (
          <aside className="feats-detail">
            <div className="card-subtitle" style={{ marginBottom: 4 }}>
              {FEAT_CATEGORY_LABEL[active.category]}
            </div>
            <h3 className="card-title">{active.name_ru}</h3>
            <p style={{ fontSize: 13.5, marginTop: 8 }}>
              <b>Требования:</b>{" "}
              <span className="muted">{active.prerequisites_ru ?? "Нет"}</span>
            </p>
            <p style={{ fontSize: 13.5, marginTop: 8 }}>{active.description_ru}</p>
            {active.is_repeatable && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                Повторяемая: можно взять несколько раз.
              </p>
            )}
            {active.code !== bg.feat_code && (
              <button
                type="button"
                className={
                  "btn btn-block" +
                  (value.includes(active.code) ? " btn-secondary" : " btn-primary")
                }
                style={{ marginTop: 12 }}
                onClick={() => toggle(active.code)}
              >
                {value.includes(active.code) ? "Убрать из выбранных" : "Добавить"}
              </button>
            )}
            {active.code === bg.feat_code && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
                Эта черта дана предысторией и не может быть удалена.
              </p>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

/* ---------------- Step: Equipment ---------------- */

const ITEM_TYPE_LABEL: Record<string, string> = {
  weapon: "Оружие",
  armor: "Броня",
  ammunition: "Боеприпасы",
  gear: "Снаряжение",
  kit: "Набор",
  tool: "Инструмент",
  currency: "Монеты",
};

function EquipmentStep({
  cls,
  bg,
  itemByCode,
  classChoice,
  bgChoice,
  onClassChoice,
  onBgChoice,
}: {
  cls: CharacterClass;
  bg: Background;
  itemByCode: Record<string, Item>;
  classChoice: EquipChoice;
  bgChoice: EquipChoice;
  onClassChoice: (c: EquipChoice) => void;
  onBgChoice: (c: EquipChoice) => void;
}) {
  const [tab, setTab] = useState<"class" | "bg">("class");

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите снаряжение</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Можно взять стандартный набор или начальное золото — для класса и для
        предыстории отдельно.
      </p>

      <div className="row" style={{ gap: 6, marginBottom: 16 }}>
        <button
          type="button"
          className={"chip" + (tab === "class" ? " is-selected" : "")}
          onClick={() => setTab("class")}
        >
          Снаряжение класса
        </button>
        <button
          type="button"
          className={"chip" + (tab === "bg" ? " is-selected" : "")}
          onClick={() => setTab("bg")}
        >
          Снаряжение предыстории
        </button>
      </div>

      {tab === "class" ? (
        <EquipmentTab
          subject={cls.name_ru}
          subjectKind="класса"
          items={cls.starting_equipment}
          gold={cls.starting_gold_alt}
          choice={classChoice}
          onChoice={onClassChoice}
          itemByCode={itemByCode}
        />
      ) : (
        <EquipmentTab
          subject={bg.name_ru}
          subjectKind="предыстории"
          items={bg.starting_equipment}
          gold={bg.starting_gold_alt}
          choice={bgChoice}
          onChoice={onBgChoice}
          itemByCode={itemByCode}
        />
      )}
    </>
  );
}

function EquipmentTab({
  subject,
  subjectKind,
  items,
  gold,
  choice,
  onChoice,
  itemByCode,
}: {
  subject: string;
  subjectKind: string;
  items: InventoryEntry[];
  gold: number;
  choice: EquipChoice;
  onChoice: (c: EquipChoice) => void;
  itemByCode: Record<string, Item>;
}) {
  return (
    <>
      <div className="card-section" style={{ marginBottom: 16 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          Снаряжение {subjectKind} «{subject}»
        </h3>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>
          Выберите способ получения снаряжения.
        </p>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label
            className={"skill-item" + (choice === "set" ? " is-selected" : "")}
            style={{ flex: "1 1 240px", cursor: "pointer" }}
          >
            <input
              type="radio"
              checked={choice === "set"}
              onChange={() => onChoice("set")}
            />
            <span>
              <b>Стандартный набор</b>
              <span className="muted" style={{ marginLeft: 6 }}>
                · {items.length} предметов
              </span>
            </span>
          </label>
          <label
            className={"skill-item" + (choice === "gold" ? " is-selected" : "")}
            style={{ flex: "1 1 240px", cursor: "pointer" }}
          >
            <input
              type="radio"
              checked={choice === "gold"}
              onChange={() => onChoice("gold")}
            />
            <span>
              <b>Начальное золото ({gold} зм)</b>
              <span className="muted" style={{ marginLeft: 6 }}>· без набора</span>
            </span>
          </label>
        </div>
      </div>

      <h3 className="card-title" style={{ marginBottom: 8 }}>
        {choice === "set" ? "Содержимое набора" : "Что вы получите"}
      </h3>
      {choice === "set" ? (
        <table className="sheet-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Тип</th>
              <th className="num">Кол-во</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const ref = itemByCode[it.code];
              return (
                <tr key={it.code}>
                  <td><b>{ref?.name_ru ?? it.code}</b></td>
                  <td className="muted">
                    {ref ? ITEM_TYPE_LABEL[ref.type] ?? ref.type : "—"}
                  </td>
                  <td className="num">{it.qty}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {ref?.description_ru ?? "—"}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">Без предметов.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: 14 }}>
          <b>{gold}</b> золотых монет (зм) на старте.
        </p>
      )}
    </>
  );
}

/* ---------------- Live Preview ---------------- */

function LivePreview({
  draft,
  race,
  cls,
  bg,
}: {
  draft: DraftState;
  race: Race | null;
  cls: CharacterClass | null;
  bg: Background | null;
}) {
  const allFilled = ABILITY_ORDER.every((a) => draft.ability_scores[a] !== undefined);
  const final = allFilled
    ? applyBonuses(draft.ability_scores as AbilityScores, draft.background_bonuses)
    : null;
  const conMod = final ? abilityModifier(final.con) : null;
  const dexMod = final ? abilityModifier(final.dex) : null;
  const hp = final && cls ? cls.hit_die + conMod! : null;
  const ac = dexMod !== null ? 10 + dexMod : null;
  const alignmentName = ALIGNMENT_OPTIONS.find((a) => a.code === draft.alignment)?.name_ru;
  const genderName = GENDER_OPTIONS.find((g) => g.code === draft.gender)?.name_ru;

  return (
    <aside className="wizard-preview">
      <div className="wizard-preview-title">Текущее состояние</div>

      <PreviewRow label="Класс" value={cls?.name_ru} />
      <PreviewRow label="Предыстория" value={bg?.name_ru} />
      <PreviewRow label="Раса" value={race?.name_ru} />
      <PreviewRow label="Пол" value={genderName} />
      <PreviewRow label="Мировоззрение" value={alignmentName} />
      <PreviewRow label="Языков" value={`${draft.languages.length} / ${REQUIRED_LANGUAGE_COUNT}`} />
      <PreviewRow label="Черт" value={draft.feats.length > 0 ? String(draft.feats.length) : undefined} />

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
          <PreviewRow label="Хиты (1 ур.)" value={hp !== null ? String(hp) : undefined} />
          <PreviewRow label="КЗ без брони" value={ac !== null ? String(ac) : undefined} />
          <PreviewRow label="Бонус мастерства" value="+2" />
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

/* ---------------- helpers ---------------- */

function isStepValid(
  step: number,
  draft: DraftState,
  cls: CharacterClass | null,
  bg: Background | null,
): boolean {
  switch (step) {
    case 0:
      return !!draft.class_code;
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
      const allFilled = ABILITY_ORDER.every((a) => draft.ability_scores[a] !== undefined);
      const sorted = ABILITY_ORDER.map((a) => draft.ability_scores[a]).sort((a, b) => a! - b!);
      const isStandardArray =
        JSON.stringify(sorted) === JSON.stringify([...STANDARD_ARRAY].sort((a, b) => a - b));
      const total = Object.values(draft.background_bonuses).reduce<number>((s, v) => s + (v ?? 0), 0);
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
      // Feats: must include the bg origin feat (auto-added on bg pick).
      return bg !== null && (!bg.feat_code || draft.feats.includes(bg.feat_code));
    case 8:
      // Equipment: choices are always set/gold — always valid.
      return true;
    case 9:
      return draft.name.trim().length > 0;
    default:
      return false;
  }
}
