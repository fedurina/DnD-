import { useEffect, useState } from "react";
import {
  ABILITY_NAMES_RU,
  ABILITY_ORDER,
  STANDARD_ARRAY,
  abilityModifier,
  applyBonuses,
  formatModifier,
} from "@/lib/dnd";
import type { AbilityCode, AbilityScores } from "@/types/character";
import type { Background } from "@/types/reference";

type DistMode = "1+1+1" | "2+1";

export function AbilitiesStep({
  base,
  bonuses,
  background,
  onBaseChange,
  onBonusesChange,
}: {
  base: Partial<Record<AbilityCode, number>>;
  bonuses: Partial<Record<AbilityCode, number>>;
  background: Background;
  onBaseChange: (v: Partial<Record<AbilityCode, number>>) => void;
  onBonusesChange: (v: Partial<Record<AbilityCode, number>>) => void;
}) {
  const initialMode: DistMode =
    Object.values(bonuses).some((v) => v === 2) ? "2+1" : "1+1+1";
  const [mode, setMode] = useState<DistMode>(initialMode);

  const remaining = STANDARD_ARRAY.filter((v) => {
    const count = STANDARD_ARRAY.filter((x) => x === v).length;
    const usedCount = Object.values(base).filter((u) => u === v).length;
    return usedCount < count;
  });

  const setBase = (ab: AbilityCode, val: number | "") => {
    const next = { ...base };
    if (val === "") delete next[ab];
    else next[ab] = val;
    onBaseChange(next);
  };

  const allChosen = ABILITY_ORDER.every((a) => base[a] !== undefined);

  const setMode2 = (m: DistMode) => {
    setMode(m);
    if (m === "1+1+1") {
      const next: Partial<Record<AbilityCode, number>> = {};
      for (const a of background.ability_scores as AbilityCode[]) next[a] = 1;
      onBonusesChange(next);
    } else {
      onBonusesChange({});
    }
  };

  useEffect(() => {
    if (Object.keys(bonuses).length === 0) setMode2("1+1+1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background.code]);

  const set2plus1 = (twoAb: AbilityCode, oneAb: AbilityCode) => {
    if (twoAb === oneAb) return;
    onBonusesChange({ [twoAb]: 2, [oneAb]: 1 });
  };

  const final = applyBonuses(
    Object.fromEntries(
      ABILITY_ORDER.map((a) => [a, base[a] ?? 0]),
    ) as AbilityScores,
    bonuses,
  );

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Характеристики</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Распределите Standard Array (15, 14, 13, 12, 10, 8) — каждое значение по разу.
      </p>

      <div className="ability-grid" style={{ marginBottom: 24 }}>
        {ABILITY_ORDER.map((a) => (
          <div className="ability-tile" key={a}>
            <div className="ability-tile-name">{ABILITY_NAMES_RU[a].full}</div>
            <select
              className="select"
              value={base[a] ?? ""}
              onChange={(e) =>
                setBase(a, e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">—</option>
              {STANDARD_ARRAY.map((v) => {
                const isCurrent = base[a] === v;
                const stillAvailable = remaining.includes(v) || isCurrent;
                return (
                  <option key={v} value={v} disabled={!stillAvailable}>
                    {v}
                  </option>
                );
              })}
            </select>
            {allChosen && (
              <>
                <div className="ability-tile-final">
                  {final[a]}
                  {bonuses[a] ? (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>
                      (+{bonuses[a]})
                    </span>
                  ) : null}
                </div>
                <div className="ability-tile-mod">
                  модификатор {formatModifier(abilityModifier(final[a]))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="card-section">
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          Бонус предыстории «{background.name_ru}» (+3)
        </h3>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>
          Доступные характеристики:{" "}
          {(background.ability_scores as AbilityCode[])
            .map((a) => ABILITY_NAMES_RU[a].full)
            .join(", ")}
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <ModeRadio
            checked={mode === "1+1+1"}
            label="+1 / +1 / +1"
            hint="по одному ко всем трём"
            onChange={() => setMode2("1+1+1")}
          />
          <ModeRadio
            checked={mode === "2+1"}
            label="+2 / +1"
            hint="к двум из трёх"
            onChange={() => setMode2("2+1")}
          />
        </div>

        {mode === "2+1" && (
          <TwoPlusOnePicker
            options={background.ability_scores as AbilityCode[]}
            current={bonuses}
            onChoose={set2plus1}
          />
        )}
      </div>
    </>
  );
}

function ModeRadio({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`skill-item${checked ? " is-selected" : ""}`}
      style={{ flex: 1, cursor: "pointer" }}
    >
      <input type="radio" checked={checked} onChange={onChange} />
      <span>
        <b>{label}</b> <span className="muted" style={{ marginLeft: 4 }}>· {hint}</span>
      </span>
    </label>
  );
}

function TwoPlusOnePicker({
  options,
  current,
  onChoose,
}: {
  options: AbilityCode[];
  current: Partial<Record<AbilityCode, number>>;
  onChoose: (twoAb: AbilityCode, oneAb: AbilityCode) => void;
}) {
  const twoAb = (Object.entries(current).find(([, v]) => v === 2)?.[0] ?? "") as
    | AbilityCode
    | "";
  const oneAb = (Object.entries(current).find(([, v]) => v === 1)?.[0] ?? "") as
    | AbilityCode
    | "";

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "1fr 1fr",
        maxWidth: 480,
      }}
    >
      <div className="field">
        <label className="label">+2 к</label>
        <select
          className="select"
          value={twoAb}
          onChange={(e) =>
            oneAb && e.target.value
              ? onChoose(e.target.value as AbilityCode, oneAb)
              : onChoose(e.target.value as AbilityCode, oneAb || options.find((o) => o !== e.target.value)!)
          }
        >
          <option value="">—</option>
          {options.map((a) => (
            <option key={a} value={a}>
              {ABILITY_NAMES_RU[a].full}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label">+1 к</label>
        <select
          className="select"
          value={oneAb}
          onChange={(e) =>
            twoAb && e.target.value
              ? onChoose(twoAb, e.target.value as AbilityCode)
              : onChoose(twoAb || options.find((o) => o !== e.target.value)!, e.target.value as AbilityCode)
          }
        >
          <option value="">—</option>
          {options
            .filter((a) => a !== twoAb)
            .map((a) => (
              <option key={a} value={a}>
                {ABILITY_NAMES_RU[a].full}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
