"use client";

import { ClockCounterClockwise, SpinnerGap, X } from "@phosphor-icons/react";
import type { HandHistoryItem } from "@/types/game";

interface TableDrawerProps {
  open: boolean;
  history: HandHistoryItem[];
  loading: boolean;
  onClose: () => void;
}

export function TableDrawer({ open, history, loading, onClose }: TableDrawerProps) {
  return (
    <aside className={`table-drawer${open ? " table-drawer--open" : ""}`} aria-label="牌局记录" aria-hidden={!open} inert={open ? undefined : true}>
      <div className="drawer-header">
        <div className="drawer-title"><ClockCounterClockwise size={18} weight="bold" aria-hidden="true" /> 牌局记录</div>
        <button className="icon-button drawer-close" type="button" onClick={onClose} aria-label="关闭侧栏"><X size={19} weight="bold" aria-hidden="true" /></button>
      </div>
      <div className="history-list" aria-live="polite">
        {loading ? <div className="drawer-empty"><span className="drawer-spinner"><SpinnerGap size={27} aria-hidden="true" /></span><p>正在读取牌局记录…</p></div> : history.length ? history.map((item) => (
          <article key={item.id}><span>第 {item.handNumber} 手</span><p>{item.summary}</p><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time></article>
        )) : <div className="drawer-empty"><ClockCounterClockwise size={27} weight="duotone" aria-hidden="true" /><p>第一手结束后，这里会显示简要记录。</p></div>}
      </div>
    </aside>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}
