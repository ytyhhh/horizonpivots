import type { CSSProperties } from "react";
import { Timer } from "@phosphor-icons/react";
import { PlayingCard } from "@/components/playing-card";
import type { ParticipantState, RoomState, WinningHandState } from "@/types/game";

interface PokerTableProps {
  state: RoomState;
  secondsLeft: number | null;
}

interface SeatStyle extends CSSProperties {
  "--seat-x": string;
  "--seat-y": string;
}

export function PokerTable({ state, secondsLeft }: PokerTableProps) {
  const { room, hand, participants, viewer } = state;
  const seated = new Map(participants.filter((participant) => participant.seat !== null).map((participant) => [participant.seat, participant]));
  const viewerSeat = typeof viewer.seat === "number" ? viewer.seat : 0;
  const seats = Array.from({ length: room.maxSeats }, (_, seat) => {
    const relative = ((seat - viewerSeat) % room.maxSeats + room.maxSeats) % room.maxSeats;
    return { seat, relative, participant: seated.get(seat) };
  });

  return (
    <section className="table-stage" aria-label="德州扑克桌面">
      <div className="poker-table">
        <div className="poker-table__rail" aria-hidden="true" />
        <div className="table-center">
          <div className="pot-display">
            <span>底池</span>
            <strong>{formatChips(hand?.pot ?? 0)}</strong>
            {hand?.sidePots?.length ? <small>{hand.sidePots.length} 个边池</small> : null}
          </div>
          <div className="community-cards" aria-label="公共牌">
            {Array.from({ length: 5 }, (_, index) => {
              const card = hand?.board[index];
              return card ? <PlayingCard key={`${card.rank}-${card.suit}-${index}`} card={card} /> : <span className="card-slot" key={index} aria-hidden="true" />;
            })}
          </div>
          <p className="street-label" aria-live="polite">{phaseLabel(hand?.phase ?? "waiting")}</p>
          {hand?.result ? <HandResult result={hand.result} /> : null}
        </div>

        {seats.map(({ seat, relative, participant }) => {
          const angle = 90 + (relative * 360) / room.maxSeats;
          const x = 50 + Math.cos((angle * Math.PI) / 180) * 44;
          const y = 50 + Math.sin((angle * Math.PI) / 180) * 42;
          const cardPlacement = y < 36 ? "below" : y > 64 ? "above" : x < 50 ? "right" : "left";
          return <Seat key={seat} seat={seat} participant={participant} state={state} secondsLeft={secondsLeft} cardPlacement={cardPlacement} style={{ "--seat-x": `${x}%`, "--seat-y": `${y}%` }} />;
        })}
      </div>
    </section>
  );
}

function Seat({ seat, participant, state, secondsLeft, cardPlacement, style }: { seat: number; participant?: ParticipantState; state: RoomState; secondsLeft: number | null; cardPlacement: "above" | "below" | "left" | "right"; style: SeatStyle }) {
  const isViewer = participant?.id === state.viewer.participantId;
  const isActing = participant?.id === state.hand?.actingParticipantId;
  const visibleCards = isViewer
    ? state.hand?.holeCards ?? participant?.cards ?? []
    : participant?.cardsVisible
      ? participant.cards ?? []
      : [];
  const shouldShowBacks = Boolean(state.hand && participant && ["active", "all_in"].includes(participant.status) && !visibleCards.length && !isViewer);

  if (!participant) {
    return (
      <div className="table-seat table-seat--empty" style={style} aria-label={`${seat + 1} 号空位`}>
        <span>{seat + 1}</span><small>空位</small>
      </div>
    );
  }

  return (
    <article className={`table-seat table-seat--cards-${cardPlacement}${isViewer ? " table-seat--viewer" : ""}${isActing ? " table-seat--acting" : ""}${participant.status === "folded" ? " table-seat--folded" : ""}`} style={style} aria-label={`${participant.nickname}，筹码 ${formatChips(participant.stack)}`}>
      <div className="seat-cards" aria-label={isViewer ? "你的底牌" : `${participant.nickname} 的底牌`}>
        {visibleCards.map((card, index) => <PlayingCard key={`${card.rank}-${card.suit}-${index}`} card={card} compact />)}
        {shouldShowBacks ? <><PlayingCard faceDown compact /><PlayingCard faceDown compact /></> : null}
      </div>
      <div className="seat-panel">
        <span className="avatar-token" aria-hidden="true">{participant.nickname.slice(0, 1).toUpperCase()}</span>
        <span className="seat-copy"><strong>{participant.nickname}{isViewer ? "（你）" : ""}</strong><small>{formatChips(participant.stack)} 筹码</small></span>
        <span className="seat-markers" aria-label="牌桌位置">
          {participant.isDealer ? <b title="庄家">D</b> : null}
          {participant.isSmallBlind ? <b title="小盲">S</b> : null}
          {participant.isBigBlind ? <b title="大盲">B</b> : null}
        </span>
      </div>
      {participant.bet > 0 ? <span className="seat-bet">下注 {formatChips(participant.bet)}</span> : null}
      {participant.status !== "active" ? <span className="seat-status">{participantStatusLabel(participant.status)}</span> : null}
      {isActing && secondsLeft !== null ? <span className="seat-timer"><Timer size={14} weight="bold" aria-hidden="true" /> {secondsLeft}</span> : null}
    </article>
  );
}

function HandResult({ result }: { result: NonNullable<NonNullable<RoomState["hand"]>["result"]> }) {
  const hands = result.winningHands ?? [];
  return (
    <section className="hand-result" aria-live="polite" aria-label="本手结算">
      <span className="hand-result__eyebrow">本手结果</span>
      <strong className="hand-result__title">{result.title}</strong>
      {hands.length ? (
        <div className="winning-hands">
          {hands.map((winner) => <WinningHand key={winner.participantId} winner={winner} />)}
        </div>
      ) : null}
      {result.reason === "fold" ? <small className="hand-result__detail">{result.detail}</small> : null}
    </section>
  );
}

function WinningHand({ winner }: { winner: WinningHandState }) {
  return (
    <div className="winning-hand">
      <span className="winning-hand__copy">
        <strong>{winner.nickname}</strong>
        <small>{winner.label}，赢得 {formatChips(winner.amount)} 筹码</small>
      </span>
      {winner.cards.length ? (
        <span className="winning-hand__cards" aria-label={`${winner.nickname} 的最佳五张牌`}>
          {winner.cards.map((card, index) => <PlayingCard key={`${card.rank}-${card.suit}-${index}`} card={card} compact />)}
        </span>
      ) : null}
    </div>
  );
}

function formatChips(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function phaseLabel(phase: string) {
  return ({ waiting: "等待开局", preflop: "翻牌前", flop: "翻牌", turn: "转牌", river: "河牌", showdown: "摊牌" } as Record<string, string>)[phase] ?? phase;
}

function participantStatusLabel(status: string) {
  return ({ waiting: "等待", ready: "已准备", folded: "已弃牌", all_in: "已全下", away: "暂离", out: "已离桌", spectating: "旁观" } as Record<string, string>)[status] ?? status;
}
