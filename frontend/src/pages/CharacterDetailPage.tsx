import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { charactersApi } from "@/api/characters";
import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  ALIGNMENT_OPTIONS,
  abilityModifier,
  applyBonuses,
  formatModifier,
} from "@/lib/dnd";
import { byCode } from "@/lib/refs";
import { useAuthStore } from "@/store/auth";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { AbilityCode, AbilityScores, Character } from "@/types/character";
import type {
  Ability,
  Background,
  CharacterClass,
  Race,
  Skill,
} from "@/types/reference";

const PROFICIENCY_BONUS = 2;

interface RefsBundle {
  abilities: Record<string, Ability>;
  skills: Record<string, Skill>;
  races: Record<string, Race>;
  classes: Record<string, CharacterClass>;
  backgrounds: Record<string, Background>;
}

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const refsStatus = useEnsureRefs();
  const refsRaw = useRefsStore();
  const refs: RefsBundle | null = useMemo(() => {
    if (refsStatus !== "loaded") return null;
    return {
      abilities: byCode(refsRaw.abilities),
      skills: byCode(refsRaw.skills),
      races: byCode(refsRaw.races),
      classes: byCode(refsRaw.classes),
      backgrounds: byCode(refsRaw.backgrounds),
    };
  }, [refsStatus, refsRaw.abilities, refsRaw.skills, refsRaw.races, refsRaw.classes, refsRaw.backgrounds]);

  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    charactersApi
      .get(id)
      .then(setCharacter)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"));
  }, [id]);

  const onArchiveToggle = async () => {
    if (!character) return;
    setActionError(null);
    try {
      const updated = character.is_archived
        ? await charactersApi.unarchive(character.id)
        : await charactersApi.archive(character.id);
      setCharacter(updated);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  };

  const onDelete = async () => {
    if (!character) return;
    if (!confirm(`Удалить персонажа «${character.name}» безвозвратно?`)) return;
    setActionError(null);
    try {
      await charactersApi.delete(character.id);
      navigate("/characters", { replace: true });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!character || !refs) return <p className="muted">Загрузка…</p>;

  const race = refs.races[character.race_code];
  const cls = refs.classes[character.class_code];
  const bg = refs.backgrounds[character.background_code];
  const alignmentLabel =
    ALIGNMENT_OPTIONS.find((a) => a.code === character.alignment)?.name_ru ?? character.alignment;
  const isOwner = currentUser?.id === character.user_id;

  return (
    <>
      <header className="page-header">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <h1>{character.name}</h1>
            {character.is_archived && <span className="badge">В архиве</span>}
            {!isOwner && <span className="badge">Просмотр от мастера</span>}
          </div>
          <p>
            {race?.name_ru} · {cls?.name_ru} · {bg?.name_ru} · {alignmentLabel}
          </p>
        </div>
        <div className="row">
          <Link
            to={`/characters/${character.id}/edit`}
            className="btn btn-secondary"
          >
            Редактировать
          </Link>
          {isOwner && (
            <>
              <button className="btn btn-secondary" onClick={onArchiveToggle}>
                {character.is_archived ? "Восстановить" : "Архивировать"}
              </button>
              <button className="btn btn-ghost" onClick={onDelete}>
                Удалить
              </button>
            </>
          )}
        </div>
      </header>

      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {character.campaigns.length > 0 && (
        <section className="card" style={{ marginBottom: 20 }}>
          <header style={{ marginBottom: 8 }}>
            <h2 className="card-title">Привязан к кампаниям</h2>
            <p className="card-subtitle">
              Параметры персонажа должны соответствовать ограничениям каждой из них.
            </p>
          </header>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 14 }}>
            {character.campaigns.map((c) => (
              <li key={c.id} style={{ marginBottom: 4 }}>
                <Link to={`/campaigns/${c.id}`}>{c.name}</Link>
                {c.needs_attention && (
                  <span className="badge" style={{ marginLeft: 8 }}>
                    Требует доработки
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <CharacterSheet character={character} refs={refs} />
    </>
  );
}

/* ---------------- Sheet ---------------- */

function CharacterSheet({
  character,
  refs,
}: {
  character: Character;
  refs: RefsBundle;
}) {
  const cls = refs.classes[character.class_code];
  const race = refs.races[character.race_code];
  const bg = refs.backgrounds[character.background_code];

  const finalScores = useMemo(
    () =>
      applyBonuses(
        character.ability_scores as AbilityScores,
        character.background_bonuses as Partial<Record<AbilityCode, number>>,
      ),
    [character],
  );

  const conMod = abilityModifier(finalScores.con);
  const dexMod = abilityModifier(finalScores.dex);
  const hp = (cls?.hit_die ?? 0) + conMod;
  const ac = 10 + dexMod;
  const initiative = dexMod;

  const proficientSkills = useMemo(
    () => new Set([...(bg?.granted_skills ?? []), ...character.chosen_skills]),
    [bg, character.chosen_skills],
  );
  const proficientSaves = new Set(cls?.saving_throw_abilities ?? []);

  const allSkills = useMemo(
    () =>
      Object.values(refs.skills).sort((a, b) =>
        a.name_ru.localeCompare(b.name_ru),
      ),
    [refs.skills],
  );

  return (
    <div className="stack">
      <section className="stat-row">
        <StatCell label="Хиты" value={String(hp)} hint={`d${cls?.hit_die ?? "?"} + ${formatModifier(conMod)} ТЕЛ`} />
        <StatCell label="КЗ" value={String(ac)} hint={`без брони, 10 + ${formatModifier(dexMod)} ЛОВ`} />
        <StatCell label="Инициатива" value={formatModifier(initiative)} hint="ЛОВ модификатор" />
        <StatCell label="Скорость" value={`${race?.speed ?? 0} фт`} hint={race?.size === "small" ? "Маленький" : "Средний"} />
        <StatCell label="Бонус мастерства" value={`+${PROFICIENCY_BONUS}`} hint={`Уровень ${character.level}`} />
      </section>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <section className="card card-compact">
          <header style={{ marginBottom: 8 }}>
            <h3 className="card-title">Характеристики и спасброски</h3>
            <p className="card-subtitle">Точка слева — владение спасброском.</p>
          </header>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Характеристика</th>
                <th className="num">Знач.</th>
                <th className="num">Мод.</th>
                <th className="num">Спасбросок</th>
              </tr>
            </thead>
            <tbody>
              {ABILITY_ORDER.map((a) => {
                const score = finalScores[a];
                const mod = abilityModifier(score);
                const isProf = proficientSaves.has(a);
                const save = mod + (isProf ? PROFICIENCY_BONUS : 0);
                const bonus = character.background_bonuses[a as AbilityCode];
                return (
                  <tr key={a}>
                    <td>
                      {ABILITY_NAMES_RU[a].full}
                      {bonus ? (
                        <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                          (+{bonus})
                        </span>
                      ) : null}
                    </td>
                    <td className="num"><b>{score}</b></td>
                    <td className="num muted">{formatModifier(mod)}</td>
                    <td className="num">
                      <span className={`prof-dot${isProf ? "" : " prof-dot-empty"}`} />
                      <b>{formatModifier(save)}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card card-compact">
          <header style={{ marginBottom: 8 }}>
            <h3 className="card-title">Навыки</h3>
            <p className="card-subtitle">
              Точка — владение (от класса или предыстории).
            </p>
          </header>
          <table className="sheet-table">
            <tbody>
              {allSkills.map((s) => {
                const ability = s.ability_code as AbilityCode;
                const mod = abilityModifier(finalScores[ability]);
                const isProf = proficientSkills.has(s.code);
                const total = mod + (isProf ? PROFICIENCY_BONUS : 0);
                return (
                  <tr key={s.code}>
                    <td>
                      <span className={`prof-dot${isProf ? "" : " prof-dot-empty"}`} />
                      {s.name_ru}{" "}
                      <span className="muted" style={{ fontSize: 11.5 }}>
                        ({ABILITY_NAMES_RU[ability].short})
                      </span>
                    </td>
                    <td className="num">
                      <b>{formatModifier(total)}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card card-compact">
        <header style={{ marginBottom: 8 }}>
          <h3 className="card-title">Расовые особенности · {race?.name_ru}</h3>
        </header>
        {race?.description_ru && (
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
            {race.description_ru}
          </p>
        )}
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13.5 }}>
          {(race?.traits ?? []).map((t) => (
            <li key={t.name_ru} style={{ marginBottom: 4 }}>
              <b>{t.name_ru}.</b>{" "}
              <span className="muted">{t.description_ru}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card card-compact">
        <header style={{ marginBottom: 8 }}>
          <h3 className="card-title">Предыстория · {bg?.name_ru}</h3>
        </header>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
          {bg?.description_ru}
        </p>
        <p style={{ fontSize: 13.5, margin: 0 }}>
          <b>Черта:</b> <span className="muted">{bg?.feat_ru}</span>
        </p>
      </section>
    </div>
  );
}

function StatCell({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="stat-cell">
      <div className="stat-cell-label">{label}</div>
      <div className="stat-cell-value">{value}</div>
      <div className="stat-cell-hint">{hint}</div>
    </div>
  );
}

