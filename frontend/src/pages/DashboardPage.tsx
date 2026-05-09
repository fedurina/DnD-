import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { campaignsApi } from "@/api/campaigns";
import { charactersApi } from "@/api/characters";
import {
  ChevronRightIcon,
  PlusIcon,
  SwordIcon,
  UsersIcon,
} from "@/components/icons";
import { byCode } from "@/lib/refs";
import { useAuthStore } from "@/store/auth";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { CampaignSummary } from "@/types/campaign";
import type { CharacterSummary } from "@/types/character";
import type { User } from "@/types/auth";

const PREVIEW_COUNT = 3;

const ROLE_LABEL_RU: Record<User["role"], string> = {
  player: "Игрок",
  master: "Мастер",
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const refsStatus = useEnsureRefs();
  const refsRaw = useRefsStore();
  const refsBundle = useMemo(() => {
    if (refsStatus !== "loaded") return null;
    return {
      races: byCode(refsRaw.races),
      classes: byCode(refsRaw.classes),
    };
  }, [refsStatus, refsRaw.races, refsRaw.classes]);

  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null);
  const [ownedCampaigns, setOwnedCampaigns] = useState<CampaignSummary[] | null>(null);
  const [joinedCampaigns, setJoinedCampaigns] = useState<CampaignSummary[] | null>(null);

  useEffect(() => {
    charactersApi
      .list(false)
      .then(setCharacters)
      .catch(() => setCharacters([]));
    campaignsApi
      .list()
      .then((data) => {
        setOwnedCampaigns(data.owned);
        setJoinedCampaigns(data.joined);
      })
      .catch(() => {
        setOwnedCampaigns([]);
        setJoinedCampaigns([]);
      });
  }, []);

  const characterPreview = useMemo(() => {
    if (!characters) return null;
    return [...characters]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, PREVIEW_COUNT);
  }, [characters]);

  const campaignsLoaded = ownedCampaigns !== null && joinedCampaigns !== null;
  const campaignPreview = useMemo(() => {
    if (!campaignsLoaded) return null;
    // Если кампания одновременно «своя» и «присоединённая» (мастер сам зашёл по коду),
    // считаем её своей — иначе бейдж покажет «Я играю» вместо «Я мастер».
    const merged = new Map<string, { campaign: CampaignSummary; isOwn: boolean }>();
    for (const c of ownedCampaigns ?? []) {
      merged.set(c.id, { campaign: c, isOwn: true });
    }
    for (const c of joinedCampaigns ?? []) {
      if (!merged.has(c.id)) {
        merged.set(c.id, { campaign: c, isOwn: false });
      }
    }
    return [...merged.values()]
      .sort((a, b) => b.campaign.created_at.localeCompare(a.campaign.created_at))
      .slice(0, PREVIEW_COUNT);
  }, [campaignsLoaded, ownedCampaigns, joinedCampaigns]);

  if (!user) return null;

  const isMaster = user.role === "master";

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Привет, {user.username}</h1>
          <p>Это ваш кабинет — последние персонажи и кампании.</p>
        </div>
      </header>

      <div className="stack-lg dashboard-cards">
        <ProfileCard user={user} />

        <Section
          title="Мои персонажи"
          allLink={
            characterPreview && characterPreview.length > 0
              ? { to: "/characters", label: "Все персонажи" }
              : null
          }
        >
          {characterPreview === null ? (
            <p className="muted">Загрузка…</p>
          ) : characterPreview.length === 0 ? (
            <EmptyState
              icon={<SwordIcon size={20} />}
              title="Пока ни одного персонажа"
              hint="Запустите визард — он проведёт через все шаги создания."
              action={{ to: "/characters/new", label: "Создать персонажа" }}
            />
          ) : (
            <div className="stack">
              {characterPreview.map((c) => (
                <CharacterPreviewCard
                  key={c.id}
                  character={c}
                  refs={refsBundle}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Мои кампании"
          allLink={
            campaignPreview && campaignPreview.length > 0
              ? { to: "/campaigns", label: "Все кампании" }
              : null
          }
        >
          {campaignPreview === null ? (
            <p className="muted">Загрузка…</p>
          ) : campaignPreview.length === 0 ? (
            <EmptyState
              icon={<UsersIcon size={20} />}
              title="Пока ни одной кампании"
              hint={
                isMaster
                  ? "Создайте первую кампанию — игрокам потребуется код приглашения."
                  : "Попросите код у мастера и присоединитесь по нему."
              }
              action={
                isMaster
                  ? { to: "/campaigns/new", label: "Создать кампанию" }
                  : { to: "/campaigns", label: "Перейти к кампаниям" }
              }
            />
          ) : (
            <div className="stack">
              {campaignPreview.map(({ campaign, isOwn }) => (
                <CampaignPreviewCard
                  key={campaign.id}
                  campaign={campaign}
                  isOwn={isOwn}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

/* ---------------- Профиль ---------------- */

function ProfileCard({ user }: { user: User }) {
  const initial = user.username.charAt(0).toUpperCase();
  return (
    <div className="card">
      <div className="row" style={{ gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--surface-2)",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="row"
            style={{ gap: 8, alignItems: "center", marginBottom: 2 }}
          >
            <h2 className="card-title" style={{ margin: 0 }}>
              {user.username}
            </h2>
            <span className="badge">{ROLE_LABEL_RU[user.role]}</span>
          </div>
          <p
            className="muted"
            style={{
              margin: 0,
              fontSize: 13.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Section + Empty ---------------- */

function Section({
  title,
  allLink,
  children,
}: {
  title: string;
  allLink: { to: string; label: string } | null;
  children: ReactNode;
}) {
  return (
    <section>
      <div
        className="row-between"
        style={{ marginBottom: 12, flexWrap: "nowrap" }}
      >
        <h2 className="card-title" style={{ fontSize: 18 }}>
          {title}
        </h2>
        {allLink && (
          <Link
            to={allLink.to}
            className="muted"
            style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {allLink.label}
            <ChevronRightIcon size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  action: { to: string; label: string };
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-hint">{hint}</div>
      <div style={{ marginTop: 16 }}>
        <Link to={action.to} className="btn btn-primary">
          <PlusIcon size={16} />
          {action.label}
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Карточки превью ---------------- */

function CharacterPreviewCard({
  character,
  refs,
}: {
  character: CharacterSummary;
  refs: { races: Record<string, { name_ru: string }>; classes: Record<string, { name_ru: string }> } | null;
}) {
  const subtitle = useMemo(() => {
    if (!refs) return "…";
    const race = refs.races[character.race_code]?.name_ru ?? character.race_code;
    const cls = refs.classes[character.class_code]?.name_ru ?? character.class_code;
    return `${race} · ${cls}`;
  }, [character.race_code, character.class_code, refs]);

  return (
    <Link to={`/characters/${character.id}`} className="card" style={{ display: "block" }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <h3 className="card-title">{character.name}</h3>
        <div className="row" style={{ gap: 6, flexShrink: 0 }}>
          {character.campaigns.length > 0 && (
            <span className="badge">В кампании</span>
          )}
          <span className="badge">Ур. {character.level}</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
        {subtitle}
      </p>
    </Link>
  );
}

function CampaignPreviewCard({
  campaign,
  isOwn,
}: {
  campaign: CampaignSummary;
  isOwn: boolean;
}) {
  const subtitle = isOwn
    ? `Игроков: ${campaign.member_count}`
    : `Мастер: ${campaign.master_username} · игроков: ${campaign.member_count}`;
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="card"
      style={{
        display: "block",
        ...(campaign.is_active ? null : { opacity: 0.7 }),
      }}
    >
      <div className="row-between" style={{ marginBottom: 6 }}>
        <h3 className="card-title">{campaign.name}</h3>
        <div className="row" style={{ gap: 6, flexShrink: 0 }}>
          {!campaign.is_active && <span className="badge">Не активна</span>}
          {campaign.needs_attention && (
            <span className="badge" title="Требует доработки">
              !
            </span>
          )}
          <span className="badge">{isOwn ? "Я мастер" : "Я играю"}</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
        {subtitle}
      </p>
    </Link>
  );
}
