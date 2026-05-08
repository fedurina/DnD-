import { useMemo, useState } from "react";
import { byCode } from "@/lib/refs";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type {
  Ability,
  Background,
  CharacterClass,
  Feat,
  FeatCategory,
  Item,
  Race,
  Skill,
  Subclass,
} from "@/types/reference";

type Tab =
  | "races"
  | "classes"
  | "subclasses"
  | "backgrounds"
  | "skills"
  | "feats"
  | "items";

const TABS: { id: Tab; label: string }[] = [
  { id: "races", label: "Расы" },
  { id: "classes", label: "Классы" },
  { id: "subclasses", label: "Архетипы" },
  { id: "backgrounds", label: "Предыстории" },
  { id: "skills", label: "Навыки" },
  { id: "feats", label: "Черты" },
  { id: "items", label: "Предметы" },
];

export default function ReferencesPage() {
  const [tab, setTab] = useState<Tab>("races");
  const status = useEnsureRefs();
  const {
    abilities,
    skills,
    races,
    classes,
    subclasses,
    backgrounds,
    feats,
    items,
    error,
  } = useRefsStore();

  const skillByCode = useMemo(() => byCode(skills), [skills]);
  const abilityByCode = useMemo(() => byCode(abilities), [abilities]);
  const featByCode = useMemo(() => byCode(feats), [feats]);
  const classByCode = useMemo(() => byCode(classes), [classes]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Справочник</h1>
          <p>D&D 5.5e (2024).</p>
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
      {status === "loaded" && tab === "subclasses" && (
        <SubclassesTab subclasses={subclasses} classByCode={classByCode} />
      )}
      {status === "loaded" && tab === "backgrounds" && (
        <BackgroundsTab
          backgrounds={backgrounds}
          featByCode={featByCode}
          skillByCode={skillByCode}
          abilityByCode={abilityByCode}
        />
      )}
      {status === "loaded" && tab === "skills" && (
        <SkillsTab skills={skills} abilityByCode={abilityByCode} />
      )}
      {status === "loaded" && tab === "feats" && <FeatsTab feats={feats} />}
      {status === "loaded" && tab === "items" && <ItemsTab items={items} />}
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
  featByCode,
  skillByCode,
  abilityByCode,
}: {
  backgrounds: Background[];
  featByCode: Record<string, Feat>;
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
          <KeyValue
            label="Черта"
            value={featByCode[b.feat_code]?.name_ru ?? b.feat_code}
          />
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

const FEAT_CATEGORY_LABEL: Record<FeatCategory, string> = {
  origin: "Происхождения",
  general: "Общие",
  fighting_style: "Боевой стиль",
};

const ITEM_TYPE_LABEL: Record<string, string> = {
  weapon: "Оружие",
  armor: "Броня",
  ammunition: "Боеприпасы",
  gear: "Снаряжение",
  kit: "Набор",
  tool: "Инструмент",
  currency: "Монеты",
};

function SubclassesTab({
  subclasses,
  classByCode,
}: {
  subclasses: Subclass[];
  classByCode: Record<string, CharacterClass>;
}) {
  return (
    <div className="grid-cards">
      {subclasses.map((s) => {
        const cls = classByCode[s.class_code];
        return (
          <article key={s.code} className="card">
            <header style={{ marginBottom: 12 }}>
              <h3 className="card-title">{s.name_ru}</h3>
              <div className="card-subtitle">
                Класс: {cls?.name_ru ?? s.class_code} · доступен с{" "}
                {cls?.subclass_start_level ?? 3} ур.
              </div>
            </header>
            <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
              {s.description_ru}
            </p>
          </article>
        );
      })}
      {subclasses.length === 0 && (
        <p className="muted">Архетипы пока не добавлены.</p>
      )}
    </div>
  );
}

function FeatsTab({ feats }: { feats: Feat[] }) {
  const [filter, setFilter] = useState<"all" | FeatCategory>("all");
  const visible =
    filter === "all" ? feats : feats.filter((f) => f.category === filter);

  return (
    <>
      <div className="row" style={{ gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all", "origin", "general", "fighting_style"] as const).map((f) => (
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
      <div className="grid-cards">
        {visible.map((f) => (
          <article key={f.code} className="card">
            <header style={{ marginBottom: 8 }}>
              <h3 className="card-title">{f.name_ru}</h3>
              <div className="card-subtitle">
                {FEAT_CATEGORY_LABEL[f.category]}
                {f.is_repeatable ? " · можно взять несколько раз" : ""}
              </div>
            </header>
            <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
              {f.description_ru}
            </p>
            {f.prerequisites_ru && (
              <KeyValue label="Требования" value={f.prerequisites_ru} />
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function ItemsTab({ items }: { items: Item[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) (map[it.type] ??= []).push(it);
    return map;
  }, [items]);

  const order = ["weapon", "armor", "ammunition", "kit", "tool", "gear", "currency"];
  const groups = order.filter((t) => grouped[t]?.length);

  return (
    <div className="stack">
      {groups.map((type) => (
        <section key={type} className="card">
          <header style={{ marginBottom: 12 }}>
            <h3 className="card-title">{ITEM_TYPE_LABEL[type] ?? type}</h3>
            <div className="card-subtitle">{grouped[type].length} предметов</div>
          </header>
          <table className="sheet-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th className="num">Цена, зм</th>
              </tr>
            </thead>
            <tbody>
              {grouped[type].map((it) => (
                <tr key={it.code}>
                  <td>
                    <b>{it.name_ru}</b>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {it.description_ru}
                  </td>
                  <td className="num">{it.cost_gp ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
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
