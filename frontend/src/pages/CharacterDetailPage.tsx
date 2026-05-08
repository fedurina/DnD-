import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { useAuthStore } from "@/store/auth";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { AbilityCode, AbilityScores, Character } from "@/types/character";
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

interface RefsBundle {
  abilities: Record<string, Ability>;
  skills: Record<string, Skill>;
  races: Record<string, Race>;
  classes: Record<string, CharacterClass>;
  backgrounds: Record<string, Background>;
  feats: Record<string, Feat>;
  items: Record<string, Item>;
  subclasses: Record<string, Subclass>;
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
      feats: byCode(refsRaw.feats),
      items: byCode(refsRaw.items),
      subclasses: byCode(refsRaw.subclasses),
    };
  }, [
    refsStatus,
    refsRaw.abilities,
    refsRaw.skills,
    refsRaw.races,
    refsRaw.classes,
    refsRaw.backgrounds,
    refsRaw.feats,
    refsRaw.items,
    refsRaw.subclasses,
  ]);

  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const onExportPdf = async () => {
    if (!character || !refs) return;
    setActionError(null);
    setExporting(true);
    try {
      const mod = await import("@/lib/pdfExport");
      const bytes = await mod.exportCharacterPdf(character, refs);
      const safe = character.name.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "character";
      mod.downloadPdf(bytes, `${safe}.pdf`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ошибка экспорта PDF");
    } finally {
      setExporting(false);
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
  const subclass = character.subclass_code
    ? refs.subclasses[character.subclass_code] ?? null
    : null;
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
            {race?.name_ru} · {cls?.name_ru}
            {subclass && <> ({subclass.name_ru})</>} · {character.level} ур. ·{" "}
            {bg?.name_ru} · {alignmentLabel}
          </p>
        </div>
        <div className="row">
          <Link
            to={`/characters/${character.id}/edit`}
            className="btn btn-secondary"
          >
            Редактировать
          </Link>
          <button
            className="btn btn-secondary"
            onClick={onExportPdf}
            disabled={exporting}
          >
            {exporting ? "Готовим…" : "Скачать PDF"}
          </button>
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

/* ---------------- Лист персонажа ---------------- */

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
  const hp = hpAtLevel(cls?.hit_die ?? 0, conMod, character.level);
  const ac = 10 + dexMod;
  const initiative = dexMod;
  const profBonus = proficiencyBonus(character.level);
  const subclass = character.subclass_code
    ? refs.subclasses[character.subclass_code] ?? null
    : null;

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
        <StatCell label="Бонус мастерства" value={`+${profBonus}`} hint={`Уровень ${character.level}`} />
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
                const save = mod + (isProf ? profBonus : 0);
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
                const total = mod + (isProf ? profBonus : 0);
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
          <b>Черта:</b>{" "}
          <span className="muted">
            {refs.feats[bg?.feat_code ?? ""]?.name_ru ?? bg?.feat_code ?? "—"}
          </span>
        </p>
      </section>

      {subclass && (
        <section className="card card-compact">
          <header style={{ marginBottom: 8 }}>
            <h3 className="card-title">Архетип · {subclass.name_ru}</h3>
            <p className="card-subtitle">
              Доступен с {cls?.subclass_start_level ?? 3} уровня класса «{cls?.name_ru ?? ""}».
            </p>
          </header>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            {subclass.description_ru}
          </p>
        </section>
      )}

      <section className="card card-compact">
        <header style={{ marginBottom: 8 }}>
          <h3 className="card-title">Личное</h3>
        </header>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13.5 }}>
          <li>
            Пол:{" "}
            <b>
              {GENDER_OPTIONS.find((g) => g.code === character.gender)?.name_ru ??
                character.gender}
            </b>
          </li>
          <li>
            Языки:{" "}
            <b>
              {character.languages
                .map(
                  (c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.name_ru ?? c,
                )
                .join(", ")}
            </b>
          </li>
        </ul>
      </section>

      {character.feats.length > 0 && (
        <section className="card card-compact">
          <header style={{ marginBottom: 8 }}>
            <h3 className="card-title">Черты</h3>
          </header>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13.5 }}>
            {character.feats.map((c) => {
              const f = refs.feats[c];
              return (
                <li key={c} style={{ marginBottom: 6 }}>
                  <b>{f?.name_ru ?? c}.</b>{" "}
                  <span className="muted">{f?.description_ru ?? ""}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card card-compact">
        <header style={{ marginBottom: 8 }}>
          <h3 className="card-title">Снаряжение и золото</h3>
        </header>
        <p style={{ fontSize: 13.5, marginBottom: 8 }}>
          <b>Золото:</b> {character.gold} зм
        </p>
        {character.items.length > 0 ? (
          <table className="sheet-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Предмет</th>
                <th className="num">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {character.items.map((it) => (
                <tr key={it.code}>
                  <td>
                    <b>{refs.items[it.code]?.name_ru ?? it.code}</b>
                    {refs.items[it.code]?.description_ru && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {refs.items[it.code].description_ru}
                      </div>
                    )}
                  </td>
                  <td className="num">{it.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ fontSize: 13.5 }}>
            Без предметов в инвентаре.
          </p>
        )}
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

