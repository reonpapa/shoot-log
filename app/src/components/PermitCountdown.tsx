import type { Firearm } from "../domain/ammunition";
import { nearestPermit } from "../domain/permit";
import "./PermitCountdown.css";

interface Props { firearms: Firearm[]; onOpen: () => void; }

export function PermitCountdown({ firearms, onOpen }: Props) {
  const nearest = nearestPermit(firearms);
  if (!nearest) return <button className="permit-countdown empty" onClick={onOpen}><span>FIREARM PERMIT</span><strong>所持許可情報を登録</strong><small>更新申請期限を管理します →</small></button>;
  const { firearm, status } = nearest;
  const countdown = status.daysToDeadline === null ? "日程を登録してください" : status.daysToDeadline >= 0 ? `あと ${status.daysToDeadline}日` : `${Math.abs(status.daysToDeadline)}日超過`;
  return <button className={`permit-countdown ${status.level}`} onClick={onOpen}>
    <div><span>FIREARM PERMIT</span><strong>{status.label}</strong><small>{firearm.name} ・ {firearm.identifier}</small></div>
    <div className="permit-countdown-days"><span>更新申請期限まで</span><strong>{countdown}</strong><small>申請期限 {firearm.renewalDeadline || "未登録"}　有効期限 {firearm.validUntil || "未登録"}</small></div>
  </button>;
}
