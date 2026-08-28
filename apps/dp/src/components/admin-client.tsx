"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowsClockwise,
  Check,
  Copy,
  DoorOpen,
  LockKey,
  Pause,
  Play,
  Trash,
  UserMinus,
  UsersThree,
} from "@phosphor-icons/react";
import { SiteHeader } from "@/components/site-header";
import { errorMessage, fetchJson } from "@/lib/api-client";
import type { RoomState, RoomSummary } from "@/types/game";

type AuditEntry = { id: string; action: string; actor: string; createdAt: string };
type ActiveRoomPayload = (RoomState & { audit?: AuditEntry[] }) | { room: RoomSummary | null; participants?: RoomState["participants"]; audit?: AuditEntry[] };

export function AdminClient() {
  const [payload, setPayload] = useState<ActiveRoomPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({ maxSeats: 6, startingStack: 10000, smallBlind: 50, bigBlind: 100, actionSeconds: 45 });
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const next = await fetchJson<ActiveRoomPayload>("/api/rooms/active");
      if (next.room) {
        setSettings({
          maxSeats: next.room.maxSeats,
          startingStack: next.room.startingStack,
          smallBlind: next.room.smallBlind,
          bigBlind: next.room.bigBlind,
          actionSeconds: next.room.actionSeconds,
        });
      }
      setPayload(next);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const room = payload?.room ?? null;
  const participants = payload && "participants" in payload ? payload.participants ?? [] : [];
  const audit = payload?.audit ?? [];
  const handNumber = payload && "hand" in payload ? payload.hand?.handNumber ?? 0 : 0;

  function manage(command: string, participantId?: string, extra?: Record<string, unknown>) {
    if (!room) return;
    setError(null);
    startTransition(async () => {
      try {
        await fetchJson(`/api/rooms/${encodeURIComponent(room.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ command, participantId, ...extra }),
        });
        await refresh();
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }

  async function copyCode() {
    if (!room?.code) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function updateSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    manage("update_settings", undefined, { settings });
  }

  function resetAllChips() {
    if (!window.confirm("确认把所有玩家的筹码恢复到起始值吗？")) return;
    manage("reset_chips");
  }

  return (
    <main className="admin-page">
      <SiteHeader backHref="/" backLabel="返回首页" isOwner />
      <section className="admin-layout" aria-labelledby="admin-title">
        <div className="admin-heading">
          <span className="admin-heading__icon"><LockKey size={24} weight="duotone" aria-hidden="true" /></span>
          <div><p className="eyebrow">仅房主可见</p><h1 id="admin-title">牌桌管理</h1><p>创建、锁定或结束当前的好友牌局。</p></div>
          <button className="secondary-button refresh-button" type="button" onClick={() => void refresh()} disabled={isPending}>
            <ArrowsClockwise size={17} weight="bold" aria-hidden="true" /> 刷新
          </button>
        </div>

        {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

        {!payload && !error ? <AdminSkeleton /> : null}
        {payload && !room ? (
          <div className="admin-empty">
            <DoorOpen size={36} weight="duotone" aria-hidden="true" />
            <h2>还没有活动牌桌</h2>
            <p>从首页开一桌，再把房间号单独发给朋友。</p>
            <Link className="primary-button" href="/">去开一桌 <ArrowRight size={18} weight="bold" aria-hidden="true" /></Link>
          </div>
        ) : null}

        {room ? (
          <div className="admin-content">
            <section className="room-overview" aria-labelledby="active-room-title">
              <div className="room-overview__top">
                <div><p className="eyebrow">当前牌桌</p><h2 id="active-room-title">{room.status === "playing" ? "牌局进行中" : room.status === "paused" ? "牌局已暂停" : "等待朋友加入"}</h2></div>
                <Link className="primary-button" href={`/room/${encodeURIComponent(room.id)}`}>进入牌桌 <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
              </div>

              <div className="room-code-panel">
                <span>房间号</span>
                <strong>{room.code ?? "仅在牌桌内显示"}</strong>
                <button className="icon-button" type="button" onClick={() => void copyCode()} disabled={!room.code} aria-label="复制房间号" title="复制房间号">
                  {copied ? <Check size={18} weight="bold" aria-hidden="true" /> : <Copy size={18} weight="bold" aria-hidden="true" />}
                </button>
              </div>

              <dl className="room-metrics">
                <div><dt>座位</dt><dd>{participants.filter((person) => person.seat !== null).length}/{room.maxSeats}</dd></div>
                <div><dt>盲注</dt><dd>{formatChips(room.smallBlind)}/{formatChips(room.bigBlind)}</dd></div>
                <div><dt>起始筹码</dt><dd>{formatChips(room.startingStack)}</dd></div>
                <div><dt>行动时间</dt><dd>{room.actionSeconds} 秒</dd></div>
              </dl>

              {room.status === "waiting" && handNumber === 0 ? (
                <form className="admin-settings" onSubmit={updateSettings}>
                  <div className="admin-settings__heading"><div><h3>开局前设置</h3><p>第一手开始后，座位和盲注会保持不变。</p></div><button className="secondary-button" type="submit" disabled={isPending || settings.bigBlind <= settings.smallBlind}>保存设置</button></div>
                  <div className="admin-settings__grid">
                    <AdminNumberField label="座位数" value={settings.maxSeats} min={2} max={9} step={1} onChange={(maxSeats) => setSettings({ ...settings, maxSeats })} />
                    <AdminNumberField label="起始筹码" value={settings.startingStack} min={1000} max={1000000} step={500} onChange={(startingStack) => setSettings({ ...settings, startingStack })} />
                    <AdminNumberField label="小盲" value={settings.smallBlind} min={1} max={50000} step={5} onChange={(smallBlind) => setSettings({ ...settings, smallBlind })} />
                    <AdminNumberField label="大盲" value={settings.bigBlind} min={2} max={100000} step={5} onChange={(bigBlind) => setSettings({ ...settings, bigBlind })} />
                    <AdminNumberField label="行动时间" value={settings.actionSeconds} min={15} max={120} step={5} suffix="秒" onChange={(actionSeconds) => setSettings({ ...settings, actionSeconds })} />
                  </div>
                </form>
              ) : null}

              <div className="admin-actions" aria-label="牌桌控制">
                {room.status === "waiting" ? <button className="primary-button" type="button" onClick={() => manage("start")} disabled={isPending}><Play size={17} weight="fill" aria-hidden="true" /> 开始牌局</button> : null}
                {room.status === "playing" ? <button className="secondary-button" type="button" onClick={() => manage("pause")} disabled={isPending}><Pause size={17} weight="fill" aria-hidden="true" /> 完成本手后暂停</button> : null}
                {room.status === "paused" ? <button className="primary-button" type="button" onClick={() => manage("resume")} disabled={isPending}><Play size={17} weight="fill" aria-hidden="true" /> 继续牌局</button> : null}
                <button className="secondary-button" type="button" onClick={() => manage(room.locked ? "unlock" : "lock")} disabled={isPending}>
                  <LockKey size={17} weight="bold" aria-hidden="true" /> {room.locked ? "开放加入" : "锁定加入"}
                </button>
                <button className="secondary-button" type="button" onClick={() => manage(room.spectatorsAllowed ? "spectators_off" : "spectators_on")} disabled={isPending}>
                  <UsersThree size={17} weight="bold" aria-hidden="true" /> {room.spectatorsAllowed ? "关闭旁观" : "开放旁观"}
                </button>
                {room.status !== "playing" ? <button className="secondary-button" type="button" onClick={resetAllChips} disabled={isPending}><ArrowsClockwise size={17} weight="bold" aria-hidden="true" /> 重置全部筹码</button> : null}
                <button className="secondary-button" type="button" onClick={() => manage("rotate_code")} disabled={isPending}><ArrowsClockwise size={17} weight="bold" aria-hidden="true" /> 重置房间号</button>
                <button className="danger-button" type="button" onClick={() => manage("end")} disabled={isPending}><Trash size={17} weight="bold" aria-hidden="true" /> 结束牌桌</button>
              </div>
            </section>

            <section className="participant-admin" aria-labelledby="participant-title">
              <div className="participant-admin__heading"><UsersThree size={23} weight="duotone" aria-hidden="true" /><div><h2 id="participant-title">参与者</h2><p>移除后，该访客的牌桌会话立即失效。</p></div></div>
              {participants.length ? (
                <div className="participant-admin__grid">
                  {participants.map((person) => (
                    <article key={person.id} className="participant-row">
                      <span className="avatar-token" aria-hidden="true">{person.nickname.slice(0, 1).toUpperCase()}</span>
                      <div><strong>{person.nickname}</strong><small>{person.seat === null ? "旁观" : `${person.seat + 1} 号座位`} / {statusLabel(person.status)}{person.joinedAt ? ` / ${formatJoinTime(person.joinedAt)}` : ""}</small></div>
                      {person.isOwner ? <span className="owner-mark">房主</span> : <button className="icon-button" type="button" onClick={() => manage("kick", person.id)} disabled={isPending} aria-label={`移除 ${person.nickname}`} title={`移除 ${person.nickname}`}><UserMinus size={18} weight="bold" aria-hidden="true" /></button>}
                    </article>
                  ))}
                </div>
              ) : <p className="participant-empty">朋友还没到。复制房间号私下邀请他们加入。</p>}
            </section>
            {audit.length ? (
              <section className="participant-admin" aria-labelledby="audit-title">
                <div className="participant-admin__heading"><ArrowsClockwise size={23} weight="duotone" aria-hidden="true" /><div><h2 id="audit-title">最近操作</h2><p>只保留必要的牌桌操作摘要，不包含底牌、牌堆或聊天正文。</p></div></div>
                <div className="participant-admin__grid">
                  {audit.slice(0, 12).map((entry) => (
                    <article key={entry.id} className="participant-row">
                      <span className="avatar-token" aria-hidden="true">{entry.actor.slice(0, 1).toUpperCase()}</span>
                      <div><strong>{auditLabel(entry.action)}</strong><small>{entry.actor} / {formatJoinTime(entry.createdAt).replace("加入", "")}</small></div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function AdminSkeleton() {
  return <div className="admin-skeleton" aria-label="正在读取牌桌"><span /><span /><span /></div>;
}

function formatChips(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function statusLabel(status: string) {
  return ({ waiting: "等待", ready: "已准备", active: "牌局中", folded: "已弃牌", all_in: "已全下", away: "暂离", out: "已离桌", spectating: "旁观" } as Record<string, string>)[status] ?? status;
}

function formatJoinTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 加入`;
}

function auditLabel(value: string) {
  const labels: Record<string, string> = {
    room_start: "开始牌局",
    room_pause: "暂停牌局",
    room_resume: "继续牌局",
    room_reset_chips: "重置筹码",
    room_update_settings: "更新设置",
    player_joined: "玩家入座",
    player_kicked: "移除访客",
    hand_settled: "结算手牌",
    automatic_hand_started: "自动开始下一手",
    automatic_pause: "自动暂停",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function AdminNumberField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="admin-number-field">
      <span>{label}</span>
      <span><input type="number" value={value} min={min} max={max} step={step} required onChange={(event) => onChange(Number(event.target.value))} />{suffix ? <small>{suffix}</small> : null}</span>
    </label>
  );
}
