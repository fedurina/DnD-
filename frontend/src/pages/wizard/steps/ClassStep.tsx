import { MAX_LEVEL, hpAtLevel, proficiencyBonus } from "@/lib/dnd";
import type { Ability, CharacterClass, Subclass } from "@/types/reference";

export function ClassStep({
  classes,
  subclasses,
  abilityByCode,
  value,
  level,
  subclassCode,
  onChange,
  onLevelChange,
  onSubclassChange,
}: {
  classes: CharacterClass[];
  subclasses: Subclass[];
  abilityByCode: Record<string, Ability>;
  value: string | null;
  level: number;
  subclassCode: string | null;
  onChange: (code: string) => void;
  onLevelChange: (level: number) => void;
  onSubclassChange: (code: string) => void;
}) {
  const cls = classes.find((c) => c.code === value) ?? null;
  const needsSubclass = cls !== null && level >= cls.subclass_start_level;
  const classSubclasses = cls
    ? subclasses.filter((s) => s.class_code === cls.code)
    : [];

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
              Выбор навыков: {c.skill_choices_count} · Архетип с {c.subclass_start_level} ур.
            </div>
          </button>
        ))}
      </div>

      {cls && (
        <div className="card-section" style={{ marginTop: 24 }}>
          <h3 className="card-title" style={{ marginBottom: 4 }}>
            Уровень персонажа
          </h3>
          <p className="card-subtitle" style={{ marginBottom: 12 }}>
            От 1 до {MAX_LEVEL}. Бонус мастерства{" "}
            <b>+{proficiencyBonus(level)}</b> · хиты{" "}
            <b>{hpAtLevel(cls.hit_die, 0, level)}</b>{" "}
            <span className="muted">(без модификатора Телосложения)</span>.
          </p>
          <div
            className="row"
            style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            <input
              type="range"
              min={1}
              max={MAX_LEVEL}
              value={level}
              onChange={(e) => onLevelChange(Number(e.target.value))}
              style={{ flex: "1 1 240px", maxWidth: 360 }}
            />
            <input
              type="number"
              className="input"
              min={1}
              max={MAX_LEVEL}
              value={level}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                onLevelChange(Math.max(1, Math.min(MAX_LEVEL, n)));
              }}
              style={{ width: 96 }}
            />
          </div>
        </div>
      )}

      {needsSubclass && (
        <div className="card-section" style={{ marginTop: 24 }}>
          <h3 className="card-title" style={{ marginBottom: 4 }}>
            Архетип «{cls!.name_ru}»
          </h3>
          <p className="card-subtitle" style={{ marginBottom: 12 }}>
            На уровне {cls!.subclass_start_level} нужно выбрать специализацию.
          </p>
          <div className="select-grid">
            {classSubclasses.map((s) => (
              <button
                key={s.code}
                type="button"
                className={`select-card${subclassCode === s.code ? " is-selected" : ""}`}
                onClick={() => onSubclassChange(s.code)}
              >
                <div className="select-card-title">{s.name_ru}</div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                  {s.description_ru}
                </p>
              </button>
            ))}
            {classSubclasses.length === 0 && (
              <p className="muted">Архетипы для этого класса пока не добавлены.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
