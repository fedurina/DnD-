import { ALIGNMENT_OPTIONS } from "@/lib/dnd";
import type { Alignment } from "@/types/character";

export function AlignmentStep({
  value,
  onChange,
}: {
  value: Alignment | null;
  onChange: (a: Alignment) => void;
}) {
  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите мировоззрение</h2>
      <p className="card-subtitle" style={{ marginBottom: 20 }}>
        Мировоззрение представляет базовые моральные и этические взгляды персонажа
        на мир, закон, общество, добро и зло.
      </p>
      <div className="select-grid">
        {ALIGNMENT_OPTIONS.map((a) => (
          <button
            key={a.code}
            className={`select-card${value === a.code ? " is-selected" : ""}`}
            onClick={() => onChange(a.code)}
            type="button"
          >
            <div className="select-card-title">{a.name_ru}</div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
              {a.description_ru}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
