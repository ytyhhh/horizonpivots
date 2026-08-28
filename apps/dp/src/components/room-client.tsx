"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowsClockwise,
  CardsThree,
  ChatCircleDots,
  Check,
  CrownSimple,
  DotsThree,
  LockKey,
  Pause,
  Play,
  ShareNetwork,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import { errorMessage, fetchJson } from "@/lib/api-client";
import { subscribeToRoom } from "@/lib/realtime-client";
import {
  buildBetPresets,
  queuedActionLabel,
  recommendedBetAmount,
  resolveQueuedAction,
  type BetPreset,
  type QueuedAction,
} from "@/lib/smart-actions";
import type { ActionKind, AvailableAction, RoomState } from "@/types/game";
import { PokerTable } from "@/components/poker-table";
import { TableDrawer } from "@/components/table-drawer";

interface RoomClientProps {
  roomId: string;
}

type ConnectionState = "connecting" | "live" | "polling" | "offline";

export function RoomClient({ roomId }: RoomClientProps) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionAmount, setActionAmount] = useState(0);
  const [queuedAction, setQueuedAction] = useState<QueuedAction | null>(null);
  const [actionAnnouncement, setActionAnnouncement] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const requestInFlight = useRef(false);
  const latestState = useRef<RoomState | null>(null);
  const queuedVersion = useRef<number | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (!silent) setConnection("connecting");
    try {
      const next = await fetchJson<RoomState>(`/api/rooms/${encodeURIComponent(roomId)}/state`);
      setState(next);
      setError(null);
      setConnection(next.room.realtimeTopic ? "live" : "polling");
    } catch (caught) {
      setError(errorMessage(caught));
      setConnection("offline");
    } finally {
      requestInFlight.current = false;
    }
  }, [roomId]);

  useEffect(() => {
    latestState.current = state;
  }, [state]);

  const performTimeout = useCallback(async () => {
    const current = latestState.current;
    if (!current?.hand?.deadlineAt) return;
    try {
      await fetchJson(`/api/rooms/${encodeURIComponent(roomId)}/actions`, {
        method: "POST",
        body: JSON.stringify({
          actionId: crypto.randomUUID(),
          expectedVersion: current.room.version,
          type: "timeout",
        }),
      });
    } catch {
      // Another client may have advanced the same deadline first. Refresh resolves either result.
    }
    await refresh(true);
  }, [refresh, roomId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 2500);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const topic = state?.room.realtimeTopic;
    if (!topic) return;
    return subscribeToRoom(topic, () => void refresh(true));
  }, [refresh, state?.room.realtimeTopic]);

  const secondsLeft = useDeadline(state?.hand?.deadlineAt ?? null, performTimeout);
  const bettingAction = useMemo(
    () => state?.availableActions.find(
      (action): action is AvailableAction & { type: "bet" | "raise" } => action.type === "bet" || action.type === "raise",
    ),
    [state?.availableActions],
  );
  const viewerParticipant = useMemo(
    () => state?.participants.find((participant) => participant.id === state.viewer.participantId),
    [state],
  );
  const betPresets = useMemo(() => bettingAction && state
    ? buildBetPresets({
        kind: bettingAction.type,
        pot: state.hand?.pot ?? 0,
        currentBet: state.hand?.currentBet ?? 0,
        viewerBet: viewerParticipant?.bet ?? 0,
        bigBlind: state.room.bigBlind,
        min: bettingAction.min ?? 0,
        max: bettingAction.max ?? 0,
      })
    : [], [bettingAction, state, viewerParticipant?.bet]);

  const effectiveActionAmount = bettingAction
    ? clamp(
        actionAmount || recommendedBetAmount(betPresets, bettingAction.min ?? bettingAction.amount ?? 0),
        bettingAction.min ?? 0,
        bettingAction.max ?? Number.MAX_SAFE_INTEGER,
      )
    : 0;

  const performAction = useCallback(async (type: ActionKind, amount?: number) => {
    const current = latestState.current;
    if (!current || actionPending) return;
    setError(null);
    setActionPending(true);
    setActionAnnouncement(`正在${actionVerb(type)}…`);
    try {
      const payload = await fetchJson<RoomState | { state?: RoomState }>(`/api/rooms/${encodeURIComponent(roomId)}/actions`, {
        method: "POST",
        body: JSON.stringify({
          actionId: crypto.randomUUID(),
          expectedVersion: current.room.version,
          type,
          ...(amount !== undefined ? { amount } : {}),
        }),
      });
      const next = "state" in payload && payload.state ? payload.state : payload as RoomState;
      if (next.room) {
        latestState.current = next;
        setState(next);
      }
      else await refresh(true);
      setActionAmount(0);
    } catch (caught) {
      setError(errorMessage(caught));
      await refresh(true);
    } finally {
      setActionPending(false);
    }
  }, [actionPending, refresh, roomId]);

  useEffect(() => {
    if (!state || !queuedAction || isPending) return;
    const handNumber = state.hand?.handNumber;
    if (handNumber !== queuedAction.handNumber) {
      const stale = window.setTimeout(() => {
        setQueuedAction(null);
        setActionAnnouncement("上一手的预操作已取消");
      }, 0);
      return () => window.clearTimeout(stale);
    }
    if (state.hand?.actingParticipantId !== state.viewer.participantId || !state.availableActions.length) return;
    if (queuedVersion.current === state.room.version) return;

    const timer = window.setTimeout(() => {
      queuedVersion.current = state.room.version;
      const resolution = resolveQueuedAction(queuedAction, state.availableActions);
      setQueuedAction(null);
      if (resolution.status === "cancel") {
        setActionAnnouncement("牌况已变化，预操作已取消，请重新选择");
        return;
      }
      setActionAnnouncement(`正在自动${actionVerb(resolution.type)}`);
      startTransition(() => performAction(resolution.type));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isPending, performAction, queuedAction, state]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, [contenteditable=true]")) return;
      const actions = state?.availableActions ?? [];
      if (event.key.toLowerCase() === "f" && actions.some((action) => action.type === "fold")) void performAction("fold");
      if (event.key.toLowerCase() === "c") {
        if (actions.some((action) => action.type === "check")) void performAction("check");
        else if (actions.some((action) => action.type === "call")) void performAction("call");
      }
      if (event.key.toLowerCase() === "a" && actions.some((action) => action.type === "all_in")) void performAction("all_in");
      if (event.key.toLowerCase() === "r" && bettingAction) void performAction(bettingAction.type, effectiveActionAmount);
      const preset = betPresets.find((option) => option.shortcut === event.key);
      if (preset) {
        event.preventDefault();
        setActionAmount(preset.amount);
        setActionAnnouncement(`已选择${preset.label}，${formatChips(preset.amount)} 筹码`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [betPresets, bettingAction, effectiveActionAmount, performAction, state?.availableActions]);

  function manageRoom(command: string, participantId?: string) {
    if (!state) return;
    setError(null);
    startTransition(async () => {
      try {
        const payload = await fetchJson<RoomState | { state?: RoomState }>(`/api/rooms/${encodeURIComponent(roomId)}`, {
          method: "PATCH",
          body: JSON.stringify({ command, participantId, expectedVersion: state.room.version }),
        });
        const next = "state" in payload && payload.state ? payload.state : payload as RoomState;
        if (next.room) setState(next);
        else await refresh(true);
        setOwnerMenuOpen(false);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }

  async function sendMessage(body: string, kind: "text" | "reaction") {
    try {
      await fetchJson(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, kind }),
      });
      await refresh(true);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function shareRoom() {
    const code = state?.room.code;
    if (!code) return;
    const text = `来好友牌桌一起玩。房间号：${code}`;
    if (navigator.share) {
      await navigator.share({ title: "好友牌桌", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!state && !error) return <RoomLoading />;
  if (!state) return <RoomFailure message={error ?? "无法读取牌桌。"} onRetry={() => void refresh()} />;

  const currentPlayer = state.participants.find((participant) => participant.id === state.hand?.actingParticipantId);
  const isWaiting = state.room.status === "waiting" || state.hand?.phase === "waiting";

  return (
    <main className="game-page">
      <header className="game-header">
        <div className="game-header__left">
          <Link className="icon-button icon-button--dark" href="/" aria-label="离开牌桌" title="离开牌桌"><ArrowLeft size={18} weight="bold" aria-hidden="true" /></Link>
          <Link className="game-wordmark" href="/"><span>HP</span><strong>好友牌桌</strong></Link>
        </div>
        <div className="game-status" aria-live="polite">
          <span className={`connection-indicator connection-indicator--${connection}`} aria-hidden="true" />
          <span>{connectionLabel(connection)}</span>
          <b>{state.room.smallBlind}/{state.room.bigBlind}</b>
        </div>
        <div className="game-header__right">
          {state.viewer.isOwner && state.room.code ? (
            <button className="header-control" type="button" onClick={() => void shareRoom()}>
              {copied ? <Check size={17} weight="bold" aria-hidden="true" /> : <ShareNetwork size={17} weight="bold" aria-hidden="true" />}
              <span>{copied ? "已复制" : "邀请"}</span>
            </button>
          ) : null}
          <button className="header-control" type="button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}>
            <ChatCircleDots size={18} weight="bold" aria-hidden="true" /><span>聊天</span>
          </button>
          {state.viewer.isOwner ? (
            <button className="icon-button icon-button--dark" type="button" onClick={() => setOwnerMenuOpen((open) => !open)} aria-label="房主管理" aria-expanded={ownerMenuOpen}><DotsThree size={22} weight="bold" aria-hidden="true" /></button>
          ) : null}
        </div>
      </header>

      {state.viewer.isOwner && ownerMenuOpen ? (
        <div className="owner-popover" role="menu" aria-label="房主管理">
          <div><CrownSimple size={19} weight="duotone" aria-hidden="true" /><span><strong>房主管理</strong><small>{state.room.code ? `房间号 ${state.room.code}` : "私密牌桌"}</small></span></div>
          {state.room.status === "waiting" ? <button role="menuitem" type="button" onClick={() => manageRoom("start")} disabled={isPending}><Play size={17} weight="fill" aria-hidden="true" /> 开始牌局</button> : null}
          {state.room.status === "playing" ? <button role="menuitem" type="button" onClick={() => manageRoom("pause")} disabled={isPending}><Pause size={17} weight="fill" aria-hidden="true" /> 本手后暂停</button> : null}
          {state.room.status === "paused" ? <button role="menuitem" type="button" onClick={() => manageRoom("resume")} disabled={isPending}><Play size={17} weight="fill" aria-hidden="true" /> 继续牌局</button> : null}
          <button role="menuitem" type="button" onClick={() => manageRoom(state.room.locked ? "unlock" : "lock")} disabled={isPending}><LockKey size={17} weight="bold" aria-hidden="true" /> {state.room.locked ? "开放加入" : "锁定加入"}</button>
          <button role="menuitem" type="button" onClick={() => manageRoom("rotate_code")} disabled={isPending}><ArrowsClockwise size={17} weight="bold" aria-hidden="true" /> 重置房间号</button>
          <Link href="/admin"><UsersThree size={17} weight="bold" aria-hidden="true" /> 完整管理</Link>
        </div>
      ) : null}

      {error ? <div className="game-notice" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)}>知道了</button></div> : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{actionAnnouncement}</p>

      <div className={`game-layout${drawerOpen ? " game-layout--drawer" : ""}`}>
        <div className="table-column">
          <div className="table-meta">
            <div>
              <span>第 {state.hand?.handNumber ?? 0} 手</span>
              <strong>{currentPlayer ? `${currentPlayer.nickname} 行动` : statusCopy(state)}</strong>
            </div>
            {state.room.locked ? <span className="locked-state"><LockKey size={14} weight="fill" aria-hidden="true" /> 已锁定加入</span> : null}
          </div>
          <PokerTable state={state} secondsLeft={secondsLeft} />

          {isWaiting ? (
            <div className="waiting-strip" aria-live="polite">
              <CardsThree size={21} weight="duotone" aria-hidden="true" />
              <span><strong>{state.participants.filter((person) => person.seat !== null).length < 2 ? "再等一位朋友" : "朋友已到，可以开局"}</strong><small>{state.viewer.isOwner ? "你可以从房主管理中开始第一手。" : "房主开始后会自动发牌。"}</small></span>
              {state.viewer.role === "player" && viewerParticipant ? (
                viewerParticipant.status === "ready"
                  ? <button className="secondary-button secondary-button--dark" type="button" onClick={() => startTransition(() => performAction("sit_out"))} disabled={isPending}><SignOut size={17} weight="bold" aria-hidden="true" /> 暂时离桌</button>
                  : <button className="primary-button primary-button--gold" type="button" onClick={() => startTransition(() => performAction("ready"))} disabled={isPending}><Check size={17} weight="bold" aria-hidden="true" /> 准备好了</button>
              ) : null}
            </div>
          ) : null}

          {!isWaiting && state.hand?.phase !== "showdown" ? (
            <ActionPanel
              state={state}
              amount={effectiveActionAmount}
              bettingAction={bettingAction}
              betPresets={betPresets}
              queuedAction={queuedAction}
              pending={isPending || actionPending}
              onAmountChange={setActionAmount}
              onAction={(type, amount) => startTransition(() => performAction(type, amount))}
              onQueue={(next) => {
                queuedVersion.current = null;
                setQueuedAction(next);
                setActionAnnouncement(next ? `已预选：${queuedActionLabel(next)}` : "预操作已取消");
              }}
            />
          ) : null}
        </div>
        <TableDrawer open={drawerOpen} messages={state.messages} history={state.history} pending={isPending} onClose={() => setDrawerOpen(false)} onSend={sendMessage} />
      </div>
      {drawerOpen ? <button className="drawer-scrim" type="button" aria-label="关闭侧栏" onClick={() => setDrawerOpen(false)} /> : null}
    </main>
  );
}

function ActionPanel({ state, amount, bettingAction, betPresets, queuedAction, pending, onAmountChange, onAction, onQueue }: { state: RoomState; amount: number; bettingAction?: AvailableAction; betPresets: BetPreset[]; queuedAction: QueuedAction | null; pending: boolean; onAmountChange: (amount: number) => void; onAction: (type: ActionKind, amount?: number) => void; onQueue: (action: QueuedAction | null) => void }) {
  const actions = state.availableActions;
  const isViewerTurn = state.hand?.actingParticipantId === state.viewer.participantId;
  const viewer = state.participants.find((participant) => participant.id === state.viewer.participantId);
  if (state.viewer.role === "spectator") return <div className="action-panel action-panel--message"><UsersThree size={20} weight="duotone" aria-hidden="true" /><span><strong>正在旁观</strong><small>你可以在聊天里回应朋友。</small></span></div>;
  if (state.room.status === "paused") return <div className="action-panel action-panel--message"><Pause size={20} weight="duotone" aria-hidden="true" /><span><strong>牌局已暂停</strong><small>房主继续后会保留当前筹码。</small></span></div>;
  if (!isViewerTurn || !actions.length) {
    const canPreselect = Boolean(
      state.hand &&
      ["preflop", "flop", "turn", "river"].includes(state.hand.phase) &&
      viewer?.status === "active",
    );
    if (!canPreselect) return <div className="action-panel action-panel--message"><CardsThree size={20} weight="duotone" aria-hidden="true" /><span><strong>等待其他玩家</strong><small>轮到你时，操作按钮会显示在这里。</small></span></div>;

    const handNumber = state.hand!.handNumber;
    const callNow = Math.max(0, state.hand!.currentBet - (viewer?.bet ?? 0));
    const queueOptions: { action: QueuedAction; label: string }[] = [
      { action: { handNumber, kind: "check" }, label: "自动过牌" },
      { action: { handNumber, kind: "check_fold" }, label: "过牌，否则弃牌" },
      ...(callNow > 0 ? [{ action: { handNumber, kind: "call_cap", cap: callNow } as QueuedAction, label: `跟注不超过 ${formatChips(callNow)}` }] : []),
    ];
    return (
      <section className="action-panel action-panel--preselect" aria-label="预操作">
        <div className="preselect-copy"><CardsThree size={20} weight="duotone" aria-hidden="true" /><span><strong>先选好下一步</strong><small>轮到你时会按最新牌况执行，金额变化时自动保护。</small></span></div>
        <div className="preselect-actions">
          {queueOptions.map(({ action, label }) => {
            const selected = sameQueuedAction(queuedAction, action);
            return <button key={action.kind} type="button" aria-pressed={selected} onClick={() => onQueue(selected ? null : action)} disabled={pending}>{selected ? <Check size={15} weight="bold" aria-hidden="true" /> : null}{label}</button>;
          })}
        </div>
      </section>
    );
  }

  const min = bettingAction?.min ?? 0;
  const max = bettingAction?.max ?? min;
  return (
    <section className="action-panel" aria-label="你的牌桌操作">
      <div className="action-buttons">
        {actions.some((action) => action.type === "fold") ? <button className="action-button action-button--quiet" type="button" onClick={() => onAction("fold")} disabled={pending} aria-keyshortcuts="F"><span>弃牌</span><kbd>F</kbd></button> : null}
        {actions.some((action) => action.type === "check") ? <button className="action-button" type="button" onClick={() => onAction("check")} disabled={pending} aria-keyshortcuts="C"><span>过牌</span><kbd>C</kbd></button> : null}
        {actions.some((action) => action.type === "call") ? <button className="action-button" type="button" onClick={() => onAction("call")} disabled={pending} aria-keyshortcuts="C"><span>跟注 {formatChips(actions.find((action) => action.type === "call")?.amount ?? 0)}</span><kbd>C</kbd></button> : null}
        {bettingAction ? <button className="action-button action-button--gold" type="button" onClick={() => onAction(bettingAction.type, amount)} disabled={pending || amount < min || amount > max} aria-keyshortcuts="R"><span>{bettingAction.type === "bet" ? "下注" : "加注"} {formatChips(amount)}</span><kbd>R</kbd></button> : null}
        {actions.some((action) => action.type === "all_in") ? <button className="action-button action-button--quiet" type="button" onClick={() => onAction("all_in")} disabled={pending} aria-keyshortcuts="A"><span>全下</span><kbd>A</kbd></button> : null}
      </div>
      {bettingAction && max > min ? (
        <div className="bet-tools">
          <div className="quick-bet-presets" role="group" aria-label="快捷下注金额">
            {betPresets.map((preset) => (
              <button key={preset.id} className={preset.recommended ? "quick-bet-button quick-bet-button--recommended" : "quick-bet-button"} type="button" onClick={() => onAction(bettingAction.type, preset.amount)} disabled={pending} aria-label={`${preset.label}，${formatChips(preset.amount)} 筹码`}>
                <span>{preset.label}{preset.recommended ? " · 建议" : ""}</span><kbd>{preset.shortcut}</kbd>
              </button>
            ))}
          </div>
          <div className="bet-control">
            <label htmlFor="bet-amount">{bettingAction.type === "bet" ? "下注金额" : "加注到"}</label>
            <input id="bet-amount" type="range" min={min} max={max} step={state.room.bigBlind} value={amount} onChange={(event) => onAmountChange(Number(event.target.value))} />
            <input className="bet-number" aria-label="筹码金额" type="number" min={min} max={max} step={state.room.bigBlind} value={amount} onChange={(event) => onAmountChange(clamp(Number(event.target.value), min, max))} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RoomLoading() {
  return (
    <main className="game-page">
      <header className="game-header"><div className="game-wordmark"><span>HP</span><strong>好友牌桌</strong></div><span className="game-loading-label">正在整理牌桌</span></header>
      <div className="room-loading"><div className="room-loading__table"><span /><span /><span /><span /><span /><span /></div><div className="room-loading__actions"><span /><span /><span /></div></div>
    </main>
  );
}

function RoomFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="game-page">
      <header className="game-header"><Link className="game-wordmark" href="/"><span>HP</span><strong>好友牌桌</strong></Link></header>
      <section className="room-failure"><LockKey size={38} weight="duotone" aria-hidden="true" /><h1>暂时无法进入牌桌</h1><p>{message}</p><div><button className="primary-button primary-button--gold" type="button" onClick={onRetry}>重新连接</button><Link className="secondary-button secondary-button--dark" href="/">返回首页</Link></div></section>
    </main>
  );
}

function useDeadline(deadlineAt: string | null, onElapsed: () => void) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const elapsedCalled = useRef(false);
  useEffect(() => {
    elapsedCalled.current = false;
    if (!deadlineAt) {
      const reset = window.setTimeout(() => setSeconds(null), 0);
      return () => window.clearTimeout(reset);
    }
    function update() {
      const remaining = Math.max(0, Math.ceil((new Date(deadlineAt!).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !elapsedCalled.current) {
        elapsedCalled.current = true;
        onElapsed();
      }
    }
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineAt, onElapsed]);
  return seconds;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function sameQueuedAction(left: QueuedAction | null, right: QueuedAction) {
  return left?.handNumber === right.handNumber && left.kind === right.kind &&
    (left.kind !== "call_cap" || right.kind !== "call_cap" || left.cap === right.cap);
}

function actionVerb(type: ActionKind) {
  const labels: Record<ActionKind, string> = {
    fold: "弃牌",
    check: "过牌",
    call: "跟注",
    bet: "下注",
    raise: "加注",
    all_in: "全下",
    ready: "准备",
    sit_out: "暂离",
    resume_seat: "回到座位",
    timeout: "处理超时",
  };
  return labels[type];
}

function formatChips(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function connectionLabel(connection: ConnectionState) {
  return ({ connecting: "正在同步", live: "实时同步", polling: "自动同步", offline: "连接中断" } as const)[connection];
}

function statusCopy(state: RoomState) {
  if (state.room.status === "paused") return "牌局已暂停";
  if (state.room.status === "waiting") return "等待朋友加入";
  if (state.hand?.phase === "showdown") return state.hand.result?.title ?? "正在结算";
  return "牌局进行中";
}
