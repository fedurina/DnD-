import { useState } from "react";
import type { Background, CharacterClass, InventoryEntry, Item } from "@/types/reference";

import type { EquipChoice } from "../types";

const ITEM_TYPE_LABEL: Record<string, string> = {
  weapon: "Оружие",
  armor: "Броня",
  ammunition: "Боеприпасы",
  gear: "Снаряжение",
  kit: "Набор",
  tool: "Инструмент",
  currency: "Монеты",
};

export function EquipmentStep({
  cls,
  bg,
  itemByCode,
  classChoice,
  bgChoice,
  onClassChoice,
  onBgChoice,
}: {
  cls: CharacterClass;
  bg: Background;
  itemByCode: Record<string, Item>;
  classChoice: EquipChoice;
  bgChoice: EquipChoice;
  onClassChoice: (c: EquipChoice) => void;
  onBgChoice: (c: EquipChoice) => void;
}) {
  const [tab, setTab] = useState<"class" | "bg">("class");

  return (
    <>
      <h2 className="card-title" style={{ marginBottom: 4 }}>Выберите снаряжение</h2>
      <p className="card-subtitle" style={{ marginBottom: 16 }}>
        Можно взять стандартный набор или начальное золото — для класса и для
        предыстории отдельно.
      </p>

      <div className="row" style={{ gap: 6, marginBottom: 16 }}>
        <button
          type="button"
          className={"chip" + (tab === "class" ? " is-selected" : "")}
          onClick={() => setTab("class")}
        >
          Снаряжение класса
        </button>
        <button
          type="button"
          className={"chip" + (tab === "bg" ? " is-selected" : "")}
          onClick={() => setTab("bg")}
        >
          Снаряжение предыстории
        </button>
      </div>

      {tab === "class" ? (
        <EquipmentTab
          subject={cls.name_ru}
          subjectKind="класса"
          items={cls.starting_equipment}
          gold={cls.starting_gold_alt}
          choice={classChoice}
          onChoice={onClassChoice}
          itemByCode={itemByCode}
        />
      ) : (
        <EquipmentTab
          subject={bg.name_ru}
          subjectKind="предыстории"
          items={bg.starting_equipment}
          gold={bg.starting_gold_alt}
          choice={bgChoice}
          onChoice={onBgChoice}
          itemByCode={itemByCode}
        />
      )}
    </>
  );
}

function EquipmentTab({
  subject,
  subjectKind,
  items,
  gold,
  choice,
  onChoice,
  itemByCode,
}: {
  subject: string;
  subjectKind: string;
  items: InventoryEntry[];
  gold: number;
  choice: EquipChoice;
  onChoice: (c: EquipChoice) => void;
  itemByCode: Record<string, Item>;
}) {
  return (
    <>
      <div className="card-section" style={{ marginBottom: 16 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          Снаряжение {subjectKind} «{subject}»
        </h3>
        <p className="card-subtitle" style={{ marginBottom: 12 }}>
          Выберите способ получения снаряжения.
        </p>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label
            className={"skill-item" + (choice === "set" ? " is-selected" : "")}
            style={{ flex: "1 1 240px", cursor: "pointer" }}
          >
            <input
              type="radio"
              checked={choice === "set"}
              onChange={() => onChoice("set")}
            />
            <span>
              <b>Стандартный набор</b>
              <span className="muted" style={{ marginLeft: 6 }}>
                · {items.length} предметов
              </span>
            </span>
          </label>
          <label
            className={"skill-item" + (choice === "gold" ? " is-selected" : "")}
            style={{ flex: "1 1 240px", cursor: "pointer" }}
          >
            <input
              type="radio"
              checked={choice === "gold"}
              onChange={() => onChoice("gold")}
            />
            <span>
              <b>Начальное золото ({gold} зм)</b>
              <span className="muted" style={{ marginLeft: 6 }}>· без набора</span>
            </span>
          </label>
        </div>
      </div>

      <h3 className="card-title" style={{ marginBottom: 8 }}>
        {choice === "set" ? "Содержимое набора" : "Что вы получите"}
      </h3>
      {choice === "set" ? (
        <table className="sheet-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Тип</th>
              <th className="num">Кол-во</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const ref = itemByCode[it.code];
              return (
                <tr key={it.code}>
                  <td><b>{ref?.name_ru ?? it.code}</b></td>
                  <td className="muted">
                    {ref ? ITEM_TYPE_LABEL[ref.type] ?? ref.type : "—"}
                  </td>
                  <td className="num">{it.qty}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {ref?.description_ru ?? "—"}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">Без предметов.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: 14 }}>
          <b>{gold}</b> золотых монет (зм) на старте.
        </p>
      )}
    </>
  );
}
