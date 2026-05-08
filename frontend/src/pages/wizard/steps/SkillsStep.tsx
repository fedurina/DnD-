import type { Background, CharacterClass, Skill } from "@/types/reference";

export function SkillsStep({
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
