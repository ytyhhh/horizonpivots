"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CardsThree,
  CheckCircle,
  CrownSimple,
  LockKey,
  UsersThree,
} from "@phosphor-icons/react";
import { fetchJson, errorMessage, roomIdFromResponse } from "@/lib/api-client";
import type { CreateRoomPayload, CreateRoomResponse, JoinRoomResponse } from "@/types/game";
import { SiteHeader } from "@/components/site-header";

interface LobbyClientProps {
  isOwner: boolean;
}

const defaultRoom: CreateRoomPayload = {
  maxSeats: 6,
  startingStack: 10000,
  smallBlind: 50,
  bigBlind: 100,
  actionSeconds: 45,
};

export function LobbyClient({ isOwner }: LobbyClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "create">("join");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<"player" | "spectator">("player");
  const [settings, setSettings] = useState(defaultRoom);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = await fetchJson<JoinRoomResponse>("/api/rooms/join", {
          method: "POST",
          body: JSON.stringify({ code: code.replace(/\s/g, "").toUpperCase(), nickname: nickname.trim(), role }),
        });
        const roomId = roomIdFromResponse(payload);
        if (!roomId) throw new Error("房间已经找到，但没有返回牌桌地址。请重新加入。");
        router.push(`/room/${encodeURIComponent(roomId)}`);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }

  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = await fetchJson<CreateRoomResponse>("/api/rooms", {
          method: "POST",
          body: JSON.stringify(settings),
        });
        const roomId = roomIdFromResponse(payload);
        if (!roomId) throw new Error("牌桌已创建，但没有返回牌桌地址。请前往管理页查看。");
        router.push(`/room/${encodeURIComponent(roomId)}`);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }

  return (
    <main className="lobby-page">
      <SiteHeader isOwner={isOwner} />
      <section className="lobby-layout" aria-labelledby="lobby-title">
        <div className="lobby-copy">
          <p className="eyebrow">Horizon Pivots 私密牌局</p>
          <h1 id="lobby-title">朋友到齐，<br />就开一桌。</h1>
          <p className="lobby-lede">只有拿到房间号的朋友才能加入。娱乐筹码没有现金价值，也不能充值、转让或兑奖。</p>
          <div className="trust-rail" aria-label="牌桌说明">
            <div><LockKey size={22} weight="duotone" aria-hidden="true" /><span><strong>房间号验证</strong><small>12 小时后自动失效</small></span></div>
            <div><UsersThree size={22} weight="duotone" aria-hidden="true" /><span><strong>2-9 位朋友</strong><small>昵称加入，无需注册</small></span></div>
            <div><CardsThree size={22} weight="duotone" aria-hidden="true" /><span><strong>完整德扑规则</strong><small>边池、全下与平分底池</small></span></div>
          </div>
        </div>

        <div className="lobby-console">
          {isOwner ? (
            <div className="mode-switch" role="tablist" aria-label="牌桌操作">
              <button type="button" role="tab" aria-selected={mode === "join"} onClick={() => { setMode("join"); setError(null); }}>加入牌局</button>
              <button type="button" role="tab" aria-selected={mode === "create"} onClick={() => { setMode("create"); setError(null); }}>开一桌</button>
            </div>
          ) : (
            <div className="console-heading">
              <span className="console-icon"><LockKey size={21} weight="duotone" aria-hidden="true" /></span>
              <div><h2>加入朋友的牌桌</h2><p>输入房主发给你的 10 位房间号。</p></div>
            </div>
          )}

          {mode === "join" ? (
            <form className="lobby-form" onSubmit={joinRoom} aria-busy={isPending}>
              {isOwner ? <div className="console-heading compact"><div><h2>加入牌局</h2><p>也可以像朋友一样加入已有房间。</p></div></div> : null}
              <label htmlFor="room-code">房间号</label>
              <div className="code-field-wrap">
                <input
                  id="room-code"
                  className="code-field"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  minLength={10}
                  maxLength={10}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, ""))}
                  placeholder="例如 7K4M2Q9XPL"
                />
                <span>{code.length}/10</span>
              </div>

              <label htmlFor="nickname">牌桌昵称</label>
              <input
                id="nickname"
                autoComplete="nickname"
                minLength={1}
                maxLength={18}
                required
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="朋友认得出的名字"
              />

              <fieldset className="role-field">
                <legend>加入身份</legend>
                <div className="segmented-control">
                  <label><input type="radio" name="role" value="player" checked={role === "player"} onChange={() => setRole("player")} /><span>坐下玩</span></label>
                  <label><input type="radio" name="role" value="spectator" checked={role === "spectator"} onChange={() => setRole("spectator")} /><span>旁观</span></label>
                </div>
              </fieldset>

              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="primary-button full-button" type="submit" disabled={isPending || code.length !== 10 || !nickname.trim()}>
                {isPending ? "正在验证房间" : "加入牌局"}
                {!isPending ? <ArrowRight size={18} weight="bold" aria-hidden="true" /> : null}
              </button>
            </form>
          ) : (
            <form className="lobby-form" onSubmit={createRoom} aria-busy={isPending}>
              <div className="console-heading compact"><span className="console-icon"><CrownSimple size={21} weight="duotone" aria-hidden="true" /></span><div><h2>设置牌桌</h2><p>开局前仍可在房间里调整。</p></div></div>
              <div className="settings-grid">
                <NumberField label="座位数" value={settings.maxSeats} min={2} max={9} step={1} onChange={(maxSeats) => setSettings({ ...settings, maxSeats })} />
                <NumberField label="起始筹码" value={settings.startingStack} min={1000} max={1000000} step={500} onChange={(startingStack) => setSettings({ ...settings, startingStack })} />
                <NumberField label="小盲" value={settings.smallBlind} min={1} max={50000} step={5} onChange={(smallBlind) => setSettings({ ...settings, smallBlind })} />
                <NumberField label="大盲" value={settings.bigBlind} min={2} max={100000} step={5} onChange={(bigBlind) => setSettings({ ...settings, bigBlind })} />
                <NumberField label="行动时间" value={settings.actionSeconds} min={15} max={120} step={5} suffix="秒" onChange={(actionSeconds) => setSettings({ ...settings, actionSeconds })} />
              </div>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="primary-button full-button" type="submit" disabled={isPending || settings.bigBlind <= settings.smallBlind}>
                {isPending ? "正在布置牌桌" : "创建私密牌桌"}
                {!isPending ? <ArrowRight size={18} weight="bold" aria-hidden="true" /> : null}
              </button>
            </form>
          )}

          <p className="console-note"><CheckCircle size={16} weight="fill" aria-hidden="true" /> 仅供受邀成年朋友娱乐，不提供任何财物结算。</p>
        </div>
      </section>
      <footer className="legal-footer">
        <span>Horizon Pivots</span>
        <p>房间号由房主私下分享。请勿公开转发。</p>
      </footer>
    </main>
  );
}

function NumberField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="number-input-wrap">
        <input type="number" value={value} min={min} max={max} step={step} required onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <small>{suffix}</small> : null}
      </span>
    </label>
  );
}
