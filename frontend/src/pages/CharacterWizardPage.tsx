import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { campaignsApi } from "@/api/campaigns";
import { charactersApi } from "@/api/characters";
import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  ALIGNMENT_OPTIONS,
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
} from "@/types/character";
import type {
  Ability,
  Background,
  CharacterClass,
  Race,
  Skill,
} from "@/types/reference";

const STEPS = ["Раса", "Класс", "Предыстория", "Характеристики", "Навыки", "Имя и итог"];

interface DraftState {
  race_code: string | null;
  class_code: string | null;
  background_code: string | null;
  ability_scores: Partial<Record<AbilityCode, number>>;
  background_bonuses: Partial<Record<AbilityCode, number>>;
  chosen_skills: string[];
  name: string;
  alignment: Alignment;
}

const initialDraft: DraftState = {
  race_code: null,
  class_code: null,
  background_code: null,
  ability_scores: {},
  background_bonuses: {},
  chosen_skills: [],
  name: "",
  alignment: "neutral",
};

export default function CharacterWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const refsStatus = useEnsureRefs();
  const refs = useRefsStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign");
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

  const eligibleRaces = useMemo(() => {
    if (!campaign || campaign.allowed_races.length === 0) return refs.races;
    return refs.races.filter((r) => campaign.allowed_races.includes(r.code));
  }, [refs.races, campaign]);

  const eligibleClasses = useMemo(() => {
    if (!campaign || campaign.allowed_classes.length === 0) return refs.classes;
    return refs.classes.filter((c) => campaign.allowed_classes.includes(c.code));
  }, [refs.classes, campaign]);

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

  const stepValid = useMemo(() => isStepValid(step, draft, selectedClass, selectedBackground),
    [step, draft, selectedClass, selectedBackground]);

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
      const payload: CharacterCreatePayload = {
        name: draft.name.trim(),
        alignment: draft.alignment,
        race_code: draft.race_code!,
        class_code: draft.class_code!,
        background_code: draft.background_code!,
        ability_scores: draft.ability_scores as AbilityScores,
        background_bonuses: draft.background_bonuses,
        chosen_skills: draft.chosen_skills,
      };
      const created = await charactersApi.create(payload);
      if (campaignId && campaign) {
        try {
          await campaignsApi.attachCharacter(campaignId, created.id);
          navigate(`/campaigns/${campaignId}`, { replace: true });
          return;
        } catch (attachErr) {
          // Character was created, but attach failed (e.g. validation surprise).
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

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Создание персонажа</h1>
          <p>D&D 5.5e (2024). Шаг {step + 1} из {STEPS.length}: {STEPS[step]}</p>
        </div>
      </header>

      {campaign && (
        <div className="alert" style={{ marginBottom: 20 }}>
          Создание персонажа для кампании <b>«{campaign.name}»</b>. Выбор ограничен расами
          и классами, разрешёнными мастером. После создания персонаж будет автоматически
          привязан к кампании.
        </div>
      )}

      <Stepper step={step} />

      <div className="card">
        {step === 0 && (
          <RaceStep
            races={eligibleRaces}
            value={draft.race_code}
            onChange={(code) => update({ race_code: code })}
          />
        )}
        {step === 1 && (
          <ClassStep
            classes={eligibleClasses}
            abilityByCode={byCode(refs.abilities)}
            value={draft.class_code}
            onChange={(code) =>
              update({
                class_code: code,
                // reset skills when class changes
                chosen_skills: [],
              })
            }
          />
        )}
        {step === 2 && (
          <BackgroundStep
            backgrounds={refs.backgrounds}
            skillByCode={byCode(refs.skills)}
            abilityByCode={byCode(refs.abilities)}
            value={draft.background_code}
            onChange={(code) =>
              update({
                background_code: code,
                // reset bonuses + chosen skills (might overlap with new bg)
                background_bonuses: {},
                chosen_skills: [],
              })
            }
          />
        )}
        {step === 3 && (
          <AbilitiesStep
            base={draft.ability_scores}
            bonuses={draft.background_bonuses}
            background={selectedBackground!}
            onBaseChange={(v) => update({ ability_scores: v })}
            onBonusesChange={(v) => update({ background_bonuses: v })}
          />
        )}
        {step === 4 && (
          <SkillsStep
            cls={selectedClass!}
            background={selectedBackground!}
            skillByCode={byCode(refs.skills)}
            value={draft.chosen_skills}
            onChange={(v) => update({ chosen_skills: v })}
          />
        )}
        {step === 5 && (
          <ReviewStep
            draft={draft}
            races={refs.races}
            classes={refs.classes}
            backgrounds={refs.backgrounds}
            skills={refs.skills}
            onName={(name) => update({ name })}
            onAlignment={(alignment) => update({ alignment })}
          />
        )}
      </div>

      {submitError && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {submitError}
        </div>
      )}

      <div className="wizard-actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/characters")}
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
              {submitting ? "Сохраняем…" : "Создать персонажа"}
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

/* ---------------- Step: Race ---------------- */

function RaceStep({
  races,
  value,
  onChange,
}: {
  races: Race[];
  value: string | null;
  onChange: (code: string) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите расу</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Раса определяет особенности и врождённые черты персонажа.
      </p>
      <div className="select-grid">
        {races.map((r) => (
          <button
            key={r.code}
            className={`select-card${value === r.code ? " is-selected" : ""}`}
            onClick={() => onChange(r.code)}
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
        Класс задаёт боевую роль и особые способности.
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
  value,
  onChange,
}: {
  backgrounds: Background[];
  skillByCode: Record<string, Skill>;
  abilityByCode: Record<string, Ability>;
  value: string | null;
  onChange: (code: string) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите предысторию</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Предыстория даёт +3 к характеристикам, 2 навыка и черту.
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
              Черта: {b.feat_ru}
            </div>
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
  // Distribution mode for background bonuses: +1+1+1 (all three) or +2/+1 (two of three).
  const initialMode: DistMode =
    Object.values(bonuses).some((v) => v === 2) ? "2+1" : "1+1+1";
  const [mode, setMode] = useState<DistMode>(initialMode);

  const used = new Set(Object.values(base).filter((v): v is number => v !== undefined));
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

  // Auto-init bonuses on first render if mode is 1+1+1 and bonuses empty.
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

/* ---------------- Step: Review ---------------- */

function ReviewStep({
  draft,
  races,
  classes,
  backgrounds,
  skills,
  onName,
  onAlignment,
}: {
  draft: DraftState;
  races: Race[];
  classes: CharacterClass[];
  backgrounds: Background[];
  skills: Skill[];
  onName: (v: string) => void;
  onAlignment: (v: Alignment) => void;
}) {
  const race = races.find((r) => r.code === draft.race_code)!;
  const cls = classes.find((c) => c.code === draft.class_code)!;
  const bg = backgrounds.find((b) => b.code === draft.background_code)!;
  const skillByCode = byCode(skills);
  const final = applyBonuses(draft.ability_scores as AbilityScores, draft.background_bonuses);
  const conMod = abilityModifier(final.con);
  const dexMod = abilityModifier(final.dex);
  const hp = cls.hit_die + conMod;

  const allSkills = Array.from(
    new Set([...bg.granted_skills, ...draft.chosen_skills]),
  );

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Итог</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Дайте имя, выберите мировоззрение и проверьте параметры.
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
        <div className="field">
          <label className="label" htmlFor="char-align">Мировоззрение</label>
          <select
            id="char-align"
            className="select"
            value={draft.alignment}
            onChange={(e) => onAlignment(e.target.value as Alignment)}
          >
            {ALIGNMENT_OPTIONS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name_ru}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-cards">
        <article className="card card-compact">
          <div className="card-subtitle">Базовые параметры</div>
          <h3 className="card-title">{cls.name_ru} · {race.name_ru}</h3>
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13.5 }}>
            <li>Уровень <b>1</b></li>
            <li>Хиты на 1 уровне: <b>{hp}</b> <span className="muted">(d{cls.hit_die} + {formatModifier(conMod)} ТЕЛ)</span></li>
            <li>КЗ без брони: <b>{10 + dexMod}</b> <span className="muted">(10 + {formatModifier(dexMod)} ЛОВ)</span></li>
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
      </div>
    </>
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
      return !!draft.race_code;
    case 1:
      return !!draft.class_code;
    case 2:
      return !!draft.background_code;
    case 3: {
      const allFilled = ABILITY_ORDER.every((a) => draft.ability_scores[a] !== undefined);
      const sorted = ABILITY_ORDER.map((a) => draft.ability_scores[a]).sort((a, b) => a! - b!);
      const isStandardArray =
        JSON.stringify(sorted) === JSON.stringify([...STANDARD_ARRAY].sort((a, b) => a - b));
      const total = Object.values(draft.background_bonuses).reduce<number>((s, v) => s + (v ?? 0), 0);
      const validBonus = total === 3 && bg !== null && Object.keys(draft.background_bonuses).every(
        (k) => (bg.ability_scores as string[]).includes(k),
      );
      return allFilled && isStandardArray && validBonus;
    }
    case 4:
      return cls !== null && draft.chosen_skills.length === cls.skill_choices_count;
    case 5:
      return draft.name.trim().length > 0;
    default:
      return false;
  }
}
