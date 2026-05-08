import { LANGUAGE_OPTIONS, REQUIRED_LANGUAGE_COUNT } from "@/lib/dnd";
import type { LanguageCode } from "@/types/character";

export function LanguageStep({
  value,
  onChange,
}: {
  value: LanguageCode[];
  onChange: (v: LanguageCode[]) => void;
}) {
  const remaining = REQUIRED_LANGUAGE_COUNT - value.length;

  const toggle = (code: LanguageCode) => {
    if (code === "common") return; // общий заблокирован
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (value.length < REQUIRED_LANGUAGE_COUNT) {
      onChange([...value, code]);
    }
  };

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выбор языков</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Общий язык выбран по умолчанию. Выберите ещё{" "}
        {REQUIRED_LANGUAGE_COUNT - 1} языка из списка стандартных.
      </p>

      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <span className="muted">Выбрано: </span>
        <b>{value.length}</b> / {REQUIRED_LANGUAGE_COUNT}
        {remaining > 0 && (
          <span className="muted">
            {" "}· осталось добавить {remaining}
          </span>
        )}
      </div>

      <div className="skill-list">
        {LANGUAGE_OPTIONS.map((l) => {
          const isSelected = value.includes(l.code);
          const isLocked = l.code === "common";
          const isFull = !isSelected && value.length >= REQUIRED_LANGUAGE_COUNT;
          return (
            <label
              key={l.code}
              className={
                "skill-item" +
                (isSelected ? " is-selected" : "") +
                (isFull || isLocked ? " is-disabled" : "")
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isFull || isLocked}
                onChange={() => toggle(l.code)}
              />
              <span>
                {l.name_ru}
                {isLocked && (
                  <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                    (по умолчанию)
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </>
  );
}
