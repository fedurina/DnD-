import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { campaignsApi } from "@/api/campaigns";
import { charactersApi } from "@/api/characters";
import { byCode } from "@/lib/refs";
import { useAuthStore } from "@/store/auth";
import { useEnsureRefs, useRefsStore } from "@/store/refs";
import type { Campaign } from "@/types/campaign";
import type { CharacterSummary } from "@/types/character";
import type { Background, CharacterClass, Race } from "@/types/reference";

interface RefsLite {
  races: Record<string, Race>;
  classes: Record<string, CharacterClass>;
  backgrounds: Record<string, Background>;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const refresh = async () => {
    if (!id) return;
    try {
      const c = await campaignsApi.get(id);
      setCampaign(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!campaign || !refs || !user) return <p className="muted">Загрузка…</p>;

  const isMaster = campaign.master_id === user.id;
  const myMembership = campaign.members.find((m) => m.user_id === user.id);

  const onCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(campaign.invite_code);
    } catch {
      // ignore
    }
  };

  const onRegenerate = async () => {
    if (!confirm("Сгенерировать новый код? Старый перестанет работать.")) return;
    try {
      const c = await campaignsApi.regenerateInvite(campaign.id);
      setCampaign(c);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  };

  const onDelete = async () => {
    if (!confirm("Удалить кампанию безвозвратно?")) return;
    try {
      await campaignsApi.delete(campaign.id);
      navigate("/campaigns", { replace: true });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  };

  const onLeave = async () => {
    if (!confirm("Выйти из кампании?")) return;
    try {
      await campaignsApi.leave(campaign.id);
      navigate("/campaigns", { replace: true });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  };

  const onKick = async (userId: string, username: string) => {
    if (!confirm(`Исключить ${username} из кампании?`)) return;
    try {
      await campaignsApi.kickMember(campaign.id, userId);
      refresh();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    }
  };

  const racesLabel = formatList(campaign.allowed_races, refs.races);
  const classesLabel = formatList(campaign.allowed_classes, refs.classes);

  return (
    <>
      <header className="page-header">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <h1>{campaign.name}</h1>
            {!campaign.is_active && <span className="badge">Не активна</span>}
          </div>
          <p>
            Мастер: <b>{campaign.master_username}</b> · уровень до {campaign.max_level} ·
            игроков {campaign.members.length}
          </p>
        </div>
        <div className="row">
          {isMaster ? (
            <button className="btn btn-ghost" onClick={onDelete}>Удалить</button>
          ) : myMembership ? (
            <button className="btn btn-ghost" onClick={onLeave}>Выйти</button>
          ) : null}
        </div>
      </header>

      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>
      )}

      <div className="stack-lg">
        {campaign.description && (
          <section className="card">
            <h2 className="card-title">Описание</h2>
            <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>{campaign.description}</p>
          </section>
        )}

        <section className="card">
          <header style={{ marginBottom: 12 }}>
            <h2 className="card-title">Ограничения</h2>
            <p className="card-subtitle">Применяются при привязке персонажа.</p>
          </header>
          <div className="stack-sm" style={{ fontSize: 14 }}>
            <div><b>Расы:</b> <span className="muted">{racesLabel}</span></div>
            <div><b>Классы:</b> <span className="muted">{classesLabel}</span></div>
            <div><b>Макс. уровень:</b> <span className="muted">{campaign.max_level}</span></div>
          </div>
        </section>

        {isMaster && (
          <section className="card">
            <header className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <h2 className="card-title">Код приглашения</h2>
                <p className="card-subtitle">Поделитесь им с игроками.</p>
              </div>
            </header>
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <span className="invite-chip">{campaign.invite_code}</span>
              <button className="btn btn-secondary btn-sm" onClick={onCopyInvite}>
                Скопировать
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onRegenerate}>
                Перевыпустить
              </button>
            </div>
          </section>
        )}

        {!isMaster && myMembership && (
          <CharacterAttachSection
            campaign={campaign}
            currentCharacterId={myMembership.character_id}
            onChanged={refresh}
            onError={(msg) => setActionError(msg)}
          />
        )}

        <section className="card">
          <header style={{ marginBottom: 12 }}>
            <h2 className="card-title">Игроки</h2>
            <p className="card-subtitle">{campaign.members.length} участников</p>
          </header>
          {campaign.members.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>Пока никого. Поделитесь кодом.</p>
          ) : (
            <table className="sheet-table">
              <thead>
                <tr>
                  <th>Игрок</th>
                  <th>Персонаж</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaign.members.map((m) => (
                  <tr key={m.user_id}>
                    <td>{m.username}</td>
                    <td className="muted">{m.character_name ?? "—"}</td>
                    <td className="num">
                      {isMaster && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onKick(m.user_id, m.username)}
                        >
                          Исключить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}

function CharacterAttachSection({
  campaign,
  currentCharacterId,
  onChanged,
  onError,
}: {
  campaign: Campaign;
  currentCharacterId: string | null;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [chars, setChars] = useState<CharacterSummary[] | null>(null);
  const [selected, setSelected] = useState<string>(currentCharacterId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    charactersApi
      .list()
      .then(setChars)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelected(currentCharacterId ?? "");
  }, [currentCharacterId]);

  const eligible = useMemo(() => {
    if (!chars) return [];
    return chars.filter((c) => {
      if (campaign.allowed_races.length && !campaign.allowed_races.includes(c.race_code)) {
        return false;
      }
      if (campaign.allowed_classes.length && !campaign.allowed_classes.includes(c.class_code)) {
        return false;
      }
      if (c.level > campaign.max_level) return false;
      return true;
    });
  }, [chars, campaign]);

  const onSave = async () => {
    setSaving(true);
    try {
      await campaignsApi.attachCharacter(campaign.id, selected || null);
      onChanged();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <header style={{ marginBottom: 12 }}>
        <h2 className="card-title">Ваш персонаж</h2>
        <p className="card-subtitle">
          Доступны только активные персонажи, проходящие по ограничениям кампании.
        </p>
      </header>
      {!chars ? (
        <p className="muted">Загрузка…</p>
      ) : eligible.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          Нет подходящих персонажей. Создайте подходящего на странице Персонажи.
        </p>
      ) : (
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ maxWidth: 360 }}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">— без персонажа —</option>
            {eligible.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (ур. {c.level})
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={saving || selected === (currentCharacterId ?? "")}
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      )}
    </section>
  );
}

function formatList(
  codes: string[],
  refs: Record<string, { name_ru: string }>,
): string {
  if (codes.length === 0) return "любые";
  return codes.map((c) => refs[c]?.name_ru ?? c).join(", ");
}
