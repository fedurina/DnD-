import { GENDER_OPTIONS } from "@/lib/dnd";
import type { Gender } from "@/types/character";
import type { Race } from "@/types/reference";

export function RaceStep({
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
