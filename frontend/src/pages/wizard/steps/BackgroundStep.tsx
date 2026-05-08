import type { Ability, Background, Feat, Skill } from "@/types/reference";

export function BackgroundStep({
  backgrounds,
  skillByCode,
  abilityByCode,
  featByCode,
  value,
  onChange,
}: {
  backgrounds: Background[];
  skillByCode: Record<string, Skill>;
  abilityByCode: Record<string, Ability>;
  featByCode: Record<string, Feat>;
  value: string | null;
  onChange: (code: string) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите предысторию</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Предыстория определяет прошлое персонажа, даёт +3 к характеристикам, 2 навыка и черту.
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
              Черта: {featByCode[b.feat_code]?.name_ru ?? b.feat_code}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
