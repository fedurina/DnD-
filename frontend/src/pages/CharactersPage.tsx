import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { charactersApi } from "@/api/characters";
import { ChevronRightIcon, PlusIcon, SwordIcon } from "@/components/icons";
import { byCode } from "@/lib/refs";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { CharacterSummary } from "@/types/character";
import type { Background, CharacterClass, Race } from "@/types/reference";

type Filter = "active" | "all" | "archived";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: "Активные" },
  { id: "all", label: "Все" },
  { id: "archived", label: "В архиве" },
];

interface RefsLite {
  races: Record<string, Race>;
  classes: Record<string, CharacterClass>;
  backgrounds: Record<string, Background>;
}

export default function CharactersPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { highlightId?: string } };
  const highlightId = location.state?.highlightId;

  const [filter, setFilter] = useState<Filter>("active");
  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refsStatus = useEnsureRefs();
  const refsRaw = useRefsStore();
  const refs: RefsLite | null = useMemo(() => {
    if (refsStatus !== "loaded") return null;
    return {
      races: byCode(refsRaw.races),
      classes: byCode(refsRaw.classes),
      backgrounds: byCode(refsRaw.backgrounds),
    };
  }, [refsStatus, refsRaw.races, refsRaw.classes, refsRaw.backgrounds]);

  useEffect(() => {
    setCharacters(null);
    const includeArchived = filter !== "active";
    charactersApi
      .list(includeArchived)
      .then((list) => {
        const filtered =
          filter === "archived" ? list.filter((c) => c.is_archived) : list;
        setCharacters(filtered);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"));
  }, [filter]);

  const isLoading = characters === null;
  const isEmpty = !isLoading && characters!.length === 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Персонажи</h1>
          <p>Создавайте героев и управляйте ими.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/characters/new")}>
          <PlusIcon size={16} />
          Создать персонажа
        </button>
      </header>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`tab${filter === f.id ? " is-active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {isLoading && <p className="muted">Загрузка…</p>}

      {isEmpty && (
        <div className="empty">
          <div className="empty-icon"><SwordIcon size={20} /></div>
          <div className="empty-title">
            {filter === "archived" ? "В архиве пусто" : "Пока ни одного персонажа"}
          </div>
          <div className="empty-hint">
            {filter === "archived"
              ? "Архивированные персонажи появятся здесь."
              : "Запустите визард — он проведёт через все шаги создания по правилам D&D 5.5e."}
          </div>
          {filter !== "archived" && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => navigate("/characters/new")}>
                <PlusIcon size={16} />
                Создать персонажа
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoading && !isEmpty && (
        <div className="grid-cards">
          {characters!.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              refs={refs}
              highlight={c.id === highlightId}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CharacterCard({
  character,
  refs,
  highlight,
}: {
  character: CharacterSummary;
  refs: RefsLite | null;
  highlight: boolean;
}) {
  const subtitle = useMemo(() => {
    if (!refs) return "…";
    const race = refs.races[character.race_code]?.name_ru ?? character.race_code;
    const cls = refs.classes[character.class_code]?.name_ru ?? character.class_code;
    const bg = refs.backgrounds[character.background_code]?.name_ru ?? character.background_code;
    return `${race} · ${cls} · ${bg}`;
  }, [character, refs]);

  return (
    <Link
      to={`/characters/${character.id}`}
      className="card"
      style={{
        display: "block",
        ...(highlight
          ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" }
          : null),
        ...(character.is_archived ? { opacity: 0.7 } : null),
      }}
    >
      <div className="row-between" style={{ marginBottom: 8 }}>
        <h3 className="card-title">{character.name}</h3>
        <div className="row" style={{ gap: 6 }}>
          {character.is_archived && <span className="badge">В архиве</span>}
          <span className="badge">Ур. {character.level}</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        {subtitle}
      </p>
      <div
        className="row"
        style={{ justifyContent: "flex-end", color: "var(--text-muted)" }}
      >
        <span style={{ fontSize: 13 }}>Открыть лист</span>
        <ChevronRightIcon size={14} />
      </div>
    </Link>
  );
}
