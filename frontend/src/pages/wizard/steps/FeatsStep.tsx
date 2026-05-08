import { useMemo, useState } from "react";
import type { Background, Feat, FeatCategory } from "@/types/reference";

const FEAT_CATEGORY_LABEL: Record<FeatCategory, string> = {
  origin: "Происхождения",
  general: "Общие",
  fighting_style: "Боевой стиль",
};

export function FeatsStep({
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
