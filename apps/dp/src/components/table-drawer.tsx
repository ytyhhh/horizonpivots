"use client";

import { FormEvent, useState } from "react";
import { ChatCircleDots, ClockCounterClockwise, PaperPlaneTilt, X } from "@phosphor-icons/react";
import type { ChatMessage, HandHistoryItem } from "@/types/game";

interface TableDrawerProps {
  open: boolean;
  messages: ChatMessage[];
  history: HandHistoryItem[];
  pending: boolean;
  onClose: () => void;
  onSend: (body: string, kind: "text" | "reaction") => Promise<void>;
}

const reactions = ["👍", "👏", "😂", "🤔", "好运", "好牌"];

export function TableDrawer({ open, messages, history, pending, onClose, onSend }: TableDrawerProps) {
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.trim();
    if (!value) return;
    if (/https?:\/\/|www\./i.test(value)) {
      setError("聊天不支持发送外部链接。");
      return;
    }
    setError(null);
    await onSend(value, "text");
    setBody("");
  }

  return (
    <aside className={`table-drawer${open ? " table-drawer--open" : ""}`} aria-label="牌桌聊天与记录" aria-hidden={!open} inert={open ? undefined : true}>
      <div className="drawer-header">
        <div className="drawer-tabs" role="tablist" aria-label="侧栏内容">
          <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}><ChatCircleDots size={18} weight="bold" aria-hidden="true" /> 聊天</button>
          <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}><ClockCounterClockwise size={18} weight="bold" aria-hidden="true" /> 牌局记录</button>
        </div>
        <button className="icon-button drawer-close" type="button" onClick={onClose} aria-label="关闭侧栏"><X size={19} weight="bold" aria-hidden="true" /></button>
      </div>

      {tab === "chat" ? (
        <>
          <div className="message-list" aria-live="polite">
            {messages.length ? messages.map((message) => <Message key={message.id} message={message} />) : <div className="drawer-empty"><ChatCircleDots size={27} weight="duotone" aria-hidden="true" /><p>还没有消息。朋友到齐后打个招呼吧。</p></div>}
          </div>
          <div className="reaction-row" aria-label="快捷回应">
            {reactions.map((reaction) => <button type="button" key={reaction} disabled={pending} onClick={() => void onSend(reaction, "reaction")}>{reaction}</button>)}
          </div>
          <form className="chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="chat-message">发送聊天消息</label>
            <input id="chat-message" value={body} maxLength={160} onChange={(event) => setBody(event.target.value)} placeholder="说点什么" disabled={pending} />
            <button className="icon-button" type="submit" disabled={pending || !body.trim()} aria-label="发送消息"><PaperPlaneTilt size={19} weight="fill" aria-hidden="true" /></button>
          </form>
          {error ? <p className="drawer-error" role="alert">{error}</p> : null}
        </>
      ) : (
        <div className="history-list">
          {history.length ? history.map((item) => (
            <article key={item.id}><span>第 {item.handNumber} 手</span><p>{item.summary}</p><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time></article>
          )) : <div className="drawer-empty"><ClockCounterClockwise size={27} weight="duotone" aria-hidden="true" /><p>第一手结束后，这里会显示简要记录。</p></div>}
        </div>
      )}
    </aside>
  );
}

function Message({ message }: { message: ChatMessage }) {
  return (
    <article className={`message message--${message.kind}`}>
      <span><strong>{message.nickname}</strong><time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></span>
      <p>{message.body}</p>
    </article>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}
