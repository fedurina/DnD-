import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { campaignsApi } from "@/api/campaigns";
import { useAuthStore } from "@/store/auth";
import { useEnsureRefs, useRefsStore } from "@/store/refs";

export default function CampaignCreatePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { id: editingId } = useParams<{ id: string }>();
  const isEdit = !!editingId;

  useEnsureRefs();
  const races = useRefsStore((s) => s.races);
  const classes = useRefsStore((s) => s.classes);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedRaces, setAllowedRaces] = useState<string[]>([]);
  const [allowedClasses, setAllowedClasses] = useState<string[]>([]);
  const [maxLevel, setMaxLevel] = useState(20);
  const [isActive, setIsActive] = useState(true);
  const [loaded, setLoaded] = useState(!isEdit);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    campaignsApi
      .get(editingId)
      .then((c) => {
        setName(c.name);
        setDescription(c.description);
        setAllowedRaces(c.allowed_races);
        setAllowedClasses(c.allowed_classes);
        setMaxLevel(c.max_level);
        setIsActive(c.is_active);
        setLoaded(true);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Не удалось загрузить кампанию"),
      );
  }, [editingId]);

  if (user?.role !== "master") {
    return <div className="alert alert-error">Только мастер может управлять кампаниями.</div>;
  }
  if (isEdit && !loaded) {
    return <p className="muted">Загрузка кампании…</p>;
  }

  const toggle = (
    list: string[],
    code: string,
    setter: (v: string[]) => void,
  ) => {
    setter(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && editingId) {
        await campaignsApi.update(editingId, {
          name,
          description,
          allowed_races: allowedRaces,
          allowed_classes: allowedClasses,
          max_level: maxLevel,
          is_active: isActive,
        });
        navigate(`/campaigns/${editingId}`, { replace: true });
        return;
      }
      const created = await campaignsApi.create({
        name,
        description,
        allowed_races: allowedRaces,
        allowed_classes: allowedClasses,
        max_level: maxLevel,
      });
      navigate(`/campaigns/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{isEdit ? "Редактирование кампании" : "Новая кампания"}</h1>
          <p>
            {isEdit
              ? "Если ужесточить ограничения, существующие персонажи могут перестать им соответствовать — рядом с ними появится метка «Требует доработки»."
              : "Задайте название и при желании ограничьте расы, классы и уровень."}
          </p>
        </div>
      </header>

      <form className="form card" style={{ maxWidth: 720 }} onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="c-name">Название</label>
          <input
            id="c-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={120}
            placeholder="например, Тени над Невервинтером"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="c-desc">Описание</label>
          <textarea
            id="c-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Кратко опишите сеттинг и тон игры."
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="c-level">Максимальный уровень: {maxLevel}</label>
          <input
            id="c-level"
            type="range"
            min={1}
            max={20}
            value={maxLevel}
            onChange={(e) => setMaxLevel(Number(e.target.value))}
          />
        </div>

        {isEdit && (
          <div className="field">
            <label
              className="skill-item"
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>
                <b>Кампания активна.</b>{" "}
                <span className="muted" style={{ marginLeft: 4 }}>
                  Если выключить, новые игроки не смогут присоединиться по коду.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="card-section">
          <CheckboxGroup
            title="Разрешённые расы"
            hint="Если ничего не выбрано — разрешены все."
            items={races.map((r) => ({ code: r.code, label: r.name_ru }))}
            selected={allowedRaces}
            onToggle={(code) => toggle(allowedRaces, code, setAllowedRaces)}
          />
        </div>

        <div className="card-section">
          <CheckboxGroup
            title="Разрешённые классы"
            hint="Если ничего не выбрано — разрешены все."
            items={classes.map((c) => ({ code: c.code, label: c.name_ru }))}
            selected={allowedClasses}
            onToggle={(code) => toggle(allowedClasses, code, setAllowedClasses)}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate(isEdit && editingId ? `/campaigns/${editingId}` : "/campaigns")
            }
          >
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? "Сохраняем…"
              : isEdit
                ? "Сохранить изменения"
                : "Создать кампанию"}
          </button>
        </div>
      </form>
    </>
  );
}

function CheckboxGroup({
  title,
  hint,
  items,
  selected,
  onToggle,
}: {
  title: string;
  hint: string;
  items: { code: string; label: string }[];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h3 className="card-title">{title}</h3>
        <p className="card-subtitle">{hint}</p>
      </div>
      <div className="skill-list">
        {items.map((it) => {
          const isSelected = selected.includes(it.code);
          return (
            <label
              key={it.code}
              className={`skill-item${isSelected ? " is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(it.code)}
              />
              <span>{it.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
