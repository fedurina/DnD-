import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { campaignsApi } from "@/api/campaigns";
import { charactersApi } from "@/api/characters";
import { byCode } from "@/lib/refs";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { Campaign } from "@/types/campaign";
import type {
  AbilityScores,
  CharacterCreatePayload,
} from "@/types/character";

import { LivePreview } from "./wizard/LivePreview";
import { Stepper } from "./wizard/Stepper";
import { computeEquipment, isStepValid } from "./wizard/helpers";
import { type DraftState, STEPS, initialDraft } from "./wizard/types";
import { AbilitiesStep } from "./wizard/steps/AbilitiesStep";
import { AlignmentStep } from "./wizard/steps/AlignmentStep";
import { BackgroundStep } from "./wizard/steps/BackgroundStep";
import { ClassStep } from "./wizard/steps/ClassStep";
import { EquipmentStep } from "./wizard/steps/EquipmentStep";
import { FeatsStep } from "./wizard/steps/FeatsStep";
import { LanguageStep } from "./wizard/steps/LanguageStep";
import { RaceStep } from "./wizard/steps/RaceStep";
import { SkillsStep } from "./wizard/steps/SkillsStep";
import { SummaryStep } from "./wizard/steps/SummaryStep";

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
          subclass_code: c.subclass_code,
          level: c.level,
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
      const needsSubclass =
        selectedClass !== null && draft.level >= selectedClass.subclass_start_level;
      const payload: CharacterCreatePayload = {
        name: draft.name.trim(),
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
              subclasses={refs.subclasses}
              abilityByCode={byCode(refs.abilities)}
              value={draft.class_code}
              level={draft.level}
              subclassCode={draft.subclass_code}
              onChange={(code) =>
                update({
                  class_code: code,
                  chosen_skills: [],
                  subclass_code: null,
                })
              }
              onLevelChange={(lvl) => {
                const cls = refs.classes.find((c) => c.code === draft.class_code);
                const stillNeedsSub =
                  cls !== undefined && lvl >= cls.subclass_start_level;
                update({
                  level: lvl,
                  subclass_code: stillNeedsSub ? draft.subclass_code : null,
                });
              }}
              onSubclassChange={(code) => update({ subclass_code: code })}
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
              subclasses={refs.subclasses}
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
          subclasses={refs.subclasses}
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
