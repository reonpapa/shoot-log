import type { StoredSession } from "../services/storage";
import { calculateSessionStats } from "../domain/shootingStats";
import "./SessionList.css";

interface Props { sessions: StoredSession[]; onCreate: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void; }
export function SessionList({ sessions, onCreate, onOpen, onDelete }: Props) {
  return <section className="session-list">
    <header className="session-list-header"><div><p className="eyebrow">SESSIONS</p><h2>射撃履歴</h2></div><button className="primary-button" onClick={onCreate}>＋ 新しいセッション</button></header>
    {sessions.length === 0 ? <div className="empty-session"><p>まだ射撃記録がありません。</p><button onClick={onCreate}>最初のセッションを作成</button></div> :
      <div className="session-card-list">{sessions.map((item) => {
        const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo });
        return <article className="session-card" key={item.id}>
          <button className="session-card-main" onClick={() => onOpen(item.id)}>
            <div className="session-card-info"><strong>{item.session.date}</strong><span>{item.session.rangeName}</span><small>{item.session.discipline.toUpperCase()} ・ {item.session.ammunitionName}</small></div>
            <div className="session-card-score"><strong>{stats.score}</strong><span>/ {stats.targets}</span><small>{item.rounds.length}R ・ 実包{stats.cartridgesUsed}発 ・ {item.status === "draft" ? "続きを入力" : "完了"}</small></div>
          </button>
          <button className="session-delete-button" aria-label={`${item.session.date}の記録を削除`} onClick={() => onDelete(item.id)}>削除</button>
        </article>;
      })}</div>}
  </section>;
}
