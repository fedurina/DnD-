import { useMemo, useState } from "react";
import { byCode } from "@/lib/refs";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type {
  Ability,
  Background,
  CharacterClass,
  Race,
  Skill,
} from "@/types/reference";

type Tab = "races" | "classes" | "backgrounds" | "skills";

const TABS: { id: Tab; label: string }[] = [
  { id: "races", label: "Расы" },
  { id: "classes", label: "Классы" },
  { id: "backgrounds", label: "Предыстории" },
  { id: "skills", label: "Навыки" },
];

export default function ReferencesPage() {
  const [tab, setTab] = useState<Tab>("races");
  const status = useEnsureRefs();
  const { abilities, skills, races, classes, backgrounds, error } = useRefsStore();

  const skillByCode = useMemo(() => byCode(skills), [skills]);
  const abilityByCode = useMemo(() => byCode(abilities), [abilities]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Справочник</h1>
          <p>D&D 5.5e (2024) — MVP-набор: 5 рас, 5 классов, 5 предысторий.</p>
        </div>
      </header>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {status !== "loaded" && !error && <p className="muted">Загрузка справочников…</p>}

      {status === "loaded" && tab === "races" && <RacesTab races={races} />}
      {status === "loaded" && tab === "classes" && (
        <ClassesTab classes={classes} skillByCode={skillByCode} abilityByCode={abilityByCode} />
      )}
      {status === "loaded" && tab === "backgrounds" && (
        <BackgroundsTab
          backgrounds={backgrounds}
          skillByCode={skillByCode}
          abilityByCode={abilityByCode}
        />
      )}
      {status === "loaded" && tab === "skills" && (
        <SkillsTab skills={skills} abilityByCode={abilityByCode} />
      )}
    </>
  );
}

function RacesTab({ races }: { races: Race[] }) {
  return (
    <div className="grid-cards">
      {races.map((r) => (
        <article key={r.code} className="card">
          <header style={{ marginBottom: 12 }}>
            <h3 className="card-title">{r.name_ru}</h3>
            <div className="card-subtitle">
              {sizeRu(r.size)} · скорость {r.speed} фт
            </div>
          </header>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13.5 }}>
            {r.description_ru}
          </p>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13.5 }}>
            {r.traits.map((t) => (
              <li key={t.name_ru} style={{ marginBottom: 4 }}>
                <b>{t.name_ru}.</b> <span className="muted">{t.description_ru}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ClassesTab({
  classes,
  skillByCode,
  abilityByCode,
}: {
  classes: CharacterClass[];
  skillByCode: Record<string, Skill>;
  abilityByCode: Record<string, Ability>;
}) {
  return (
    <div className="grid-cards">
      {classes.map((c) => (
        <article key={c.code} className="card">
          <header style={{ marginBottom: 12 }}>
            <h3 className="card-title">{c.name_ru}</h3>
            <div className="card-subtitle">
              Кость хитов d{c.hit_die} · Основа:{" "}
              {c.primary_abilities.map((a) => abilityByCode[a]?.short_ru ?? a).join(", ")}
            </div>
          </header>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13.5 }}>
            {c.description_ru}
          </p>
          <KeyValue
            label="Спасброски"
            value={c.saving_throw_abilities.map((a) => abilityByCode[a]?.name_ru ?? a).join(", ")}
          />
          <KeyValue
            label={`Навыки (выбрать ${c.skill_choices_count})`}
            value={c.skill_options.map((s) => skillByCode[s]?.name_ru ?? s).join(", ")}
          />
        </article>
      ))}
    </div>
  );
}

function BackgroundsTab({
  backgrounds,
  skillByCode,
  abilityByCode,
}: {
  backgrounds: Background[];
  skillByCode: Record<string, Skill>;
  abilityByCode: Record<string, Ability>;
}) {
  return (
    <div className="grid-cards">
      {backgrounds.map((b) => (
        <article key={b.code} className="card">
          <header style={{ marginBottom: 12 }}>
            <h3 className="card-title">{b.name_ru}</h3>
          </header>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13.5 }}>
            {b.description_ru}
          </p>
          <KeyValue
            label="Бонусы характеристик (+3 распределить)"
            value={b.ability_scores.map((a) => abilityByCode[a]?.name_ru ?? a).join(", ")}
          />
          <KeyValue
            label="Навыки"
            value={b.granted_skills.map((s) => skillByCode[s]?.name_ru ?? s).join(", ")}
          />
          <KeyValue label="Черта" value={b.feat_ru} />
        </article>
      ))}
    </div>
  );
}

function SkillsTab({
  skills,
  abilityByCode,
}: {
  skills: Skill[];
  abilityByCode: Record<string, Ability>;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const s of skills) {
      (map[s.ability_code] ??= []).push(s);
    }
    return map;
  }, [skills]);

  return (
    <div className="grid-cards">
      {Object.entries(grouped).map(([abil, items]) => (
        <article key={abil} className="card">
          <header style={{ marginBottom: 12 }}>
            <h3 className="card-title">{abilityByCode[abil]?.name_ru ?? abil}</h3>
            <div className="card-subtitle">{items.length} навыков</div>
          </header>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13.5 }}>
            {items.map((s) => (
              <li key={s.code}>{s.name_ru}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8, fontSize: 13.5 }}>
      <div
        style={{
          fontSize: 11.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-faint)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}

function sizeRu(size: string) {
  return size === "small" ? "Маленький" : "Средний";
}
