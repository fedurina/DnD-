import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { campaignsApi } from "@/api/campaigns";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { useAuthStore } from "@/store/auth";
import type { CampaignSummary, CampaignsResponse } from "@/types/campaign";

export default function CampaignsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isMaster = user?.role === "master";

  const [data, setData] = useState<CampaignsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);

  const refresh = () =>
    campaignsApi
      .list()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Кампании</h1>
          <p>
            {isMaster
              ? "Создавайте кампании и приглашайте игроков по коду."
              : "Присоединяйтесь к играм по коду от мастера."}
          </p>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
            Войти по коду
          </button>
          {isMaster && (
            <button className="btn btn-primary" onClick={() => navigate("/campaigns/new")}>
              <PlusIcon size={16} />
              Создать кампанию
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {!data && <p className="muted">Загрузка…</p>}

      {data && (
        <div className="stack-lg">
          {isMaster && (
            <Section
              title="Я мастер"
              campaigns={data.owned}
              emptyHint="Создайте первую кампанию — игрокам потребуется код приглашения."
              role="master"
              onCreate={() => navigate("/campaigns/new")}
            />
          )}
          <Section
            title="Я участвую"
            campaigns={data.joined}
            emptyHint="Попросите код у мастера и нажмите «Войти по коду»."
            role="player"
            onCreate={() => setShowJoin(true)}
            createLabel="Войти по коду"
          />
        </div>
      )}

      {showJoin && (
        <JoinByCodeModal
          onClose={() => setShowJoin(false)}
          onJoined={() => {
            setShowJoin(false);
            refresh();
          }}
        />
      )}
    </>
  );
}

function Section({
  title,
  campaigns,
  emptyHint,
  role,
  onCreate,
  createLabel = "Создать",
}: {
  title: string;
  campaigns: CampaignSummary[];
  emptyHint: string;
  role: "master" | "player";
  onCreate?: () => void;
  createLabel?: string;
}) {
  return (
    <section>
      <div className="section-label">{title}</div>
      {campaigns.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><UsersIcon size={20} /></div>
          <div className="empty-title">Список пока пуст</div>
          <div className="empty-hint">{emptyHint}</div>
          {onCreate && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={onCreate}>
                {createLabel}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid-cards">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} role={role} />
          ))}
        </div>
      )}
    </section>
  );
}

function CampaignCard({
  campaign,
  role,
}: {
  campaign: CampaignSummary;
  role: "master" | "player";
}) {
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="card"
      style={{
        display: "block",
        ...(campaign.is_active ? null : { opacity: 0.7 }),
      }}
    >
      <div className="row-between" style={{ marginBottom: 8 }}>
        <h3 className="card-title">{campaign.name}</h3>
        <div className="row" style={{ gap: 6 }}>
          {campaign.needs_attention && (
            <span
              className="badge"
              title={
                role === "master"
                  ? "Есть участники с несоответствующими персонажами"
                  : "Ваш персонаж не соответствует ограничениям"
              }
            >
              Требует доработки
            </span>
          )}
          <span className="badge">Ур. до {campaign.max_level}</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
        {role === "master"
          ? `Игроков: ${campaign.member_count}`
          : `Мастер: ${campaign.master_username} · игроков: ${campaign.member_count}`}
      </p>
      <div className="row" style={{ justifyContent: "flex-end", color: "var(--text-muted)" }}>
        <span style={{ fontSize: 13 }}>Открыть</span>
        <ChevronRightIcon size={14} />
      </div>
    </Link>
  );
}

function JoinByCodeModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await campaignsApi.join(code.trim().toUpperCase());
      onJoined();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="card-title">Войти в кампанию</h2>
        <p className="card-subtitle" style={{ marginBottom: 20 }}>
          Введите код приглашения от мастера. Персонажа можно привязать позже.
        </p>
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="join-code">Код приглашения</label>
            <input
              id="join-code"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD1234"
              required
              minLength={4}
              maxLength={16}
              autoCapitalize="characters"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Входим…" : "Войти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
