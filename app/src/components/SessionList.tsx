import type { StoredSession } from "../services/storage";
import { calculateSessionStats } from "../domain/shootingStats";
import { useState } from "react";
import type { Firearm } from "../domain/ammunition";
import "./SessionList.css";

interface Props { sessions: StoredSession[]; firearms: Firearm[]; onCreate: () => void; onManage: () => void; onData: () => void; onAccount: () => void; onAmmunition: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void; }
export function SessionList({ sessions, firearms, onCreate, onManage, onData, onAccount, onAmmunition, onOpen, onDelete }: Props) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const drafts = sessions.filter((item) => item.status === "draft");
  const orderedSessions = [...sessions].sort((a, b) =>
    b.session.date.localeCompare(a.session.date) || b.createdAt.localeCompare(a.createdAt)
  );
  const totalPages = Math.max(1, Math.ceil(orderedSessions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSessions = orderedSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <section className="session-list">
    <header className="session-list-header"><div><p className="eyebrow">SESSIONS</p><h2>射撃履歴</h2></div><div className="session-list-actions"><button className="account-button" onClick={onAccount}>アカウント</button><button onClick={onData}>バックアップ</button><button onClick={onManage}>登録内容を管理</button><button className="ammo-ledger-button" onClick={onAmmunition}>実包管理</button><button className="primary-button" onClick={onCreate}>＋ 新しいセッション</button></div></header>
    {drafts.length > 0 && <button className="unfinished-alert" onClick={() => onOpen(drafts[0].id)}><strong>未完了セッション {drafts.length}件</strong><span>入力を続ける →</span></button>}
    {sessions.length === 0 ? <div className="empty-session"><p>まだ射撃記録がありません。</p><button onClick={onCreate}>最初のセッションを作成</button></div> :
      <div className="session-card-list">{visibleSessions.map((item) => {
        const stats = calculateSessionStats({ id: item.id, date: item.session.date, rangeName: item.session.rangeName, ammunitionName: item.session.ammunitionName, weather: item.session.weather, rounds: item.rounds, sessionMemo: item.session.memo });
        const firearm = firearms.find((candidate) => candidate.id === item.session.firearmId);
        return <article className={`session-card${item.status === "draft" ? " unfinished" : ""}`} key={item.id}>
          <button className="session-card-main" onClick={() => onOpen(item.id)}>
            <div className="session-card-info"><strong>{item.session.date}</strong><span>{item.session.rangeName}</span><small>{item.session.discipline.toUpperCase()} ・ {firearm ? `${firearm.name}（${firearm.identifier}）` : "使用銃未設定"} ・ {item.session.ammunitionName}</small><div className="session-card-meta">{item.session.weather && <span>天候：{item.session.weather}</span>}{item.session.memo && <span className="session-card-memo">メモ：{item.session.memo}</span>}{item.review?.nextChallenge && <span className="session-card-challenge">次回：{item.review.nextChallenge}</span>}</div></div>
            <div className="session-card-score"><strong>{stats.score}</strong><span>/ {stats.targets}</span><small>{item.rounds.length}R ・ 実包{stats.cartridgesUsed}発</small>{item.status === "draft" && <b>未完了・入力を続ける</b>}{item.status === "completed" && <small>完了</small>}</div>
          </button>
          <button className="session-delete-button" aria-label={`${item.session.date}の記録を削除`} onClick={() => onDelete(item.id)}>削除</button>
        </article>;
      })}</div>}
    {totalPages > 1 && <nav className="session-pagination" aria-label="射撃履歴のページ"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← 前へ</button><span><strong>{currentPage}</strong> / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>次へ →</button></nav>}
  </section>;
}
