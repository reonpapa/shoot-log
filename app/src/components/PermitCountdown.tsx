import type { Firearm } from "../domain/ammunition";
import { nearestPermit } from "../domain/permit";
import "./PermitCountdown.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { firearms: Firearm[]; onOpen: () => void; }

export function PermitCountdown({ firearms, onOpen }: Props) {
  const { text } = useLanguage();
  const nearest = nearestPermit(firearms);
  if (!nearest) return <button className="permit-countdown empty" onClick={onOpen}><span>FIREARM PERMIT</span><strong>{text("所持許可情報を登録", "Add firearm permit")}</strong><small>{text("更新申請期限を管理します →", "Manage renewal deadlines →")}</small></button>;
  const { firearm, status } = nearest;
  const countdown = status.daysToDeadline === null ? text("日程を登録してください", "Add schedule") : status.daysToDeadline >= 0 ? text(`あと ${status.daysToDeadline}日`, `${status.daysToDeadline} days remaining`) : text(`${Math.abs(status.daysToDeadline)}日超過`, `${Math.abs(status.daysToDeadline)} days overdue`);
  return <button className={`permit-countdown ${status.level}`} onClick={onOpen}>
    <div><span>FIREARM PERMIT</span><strong>{text(status.label, ({ incomplete: "Renewal schedule not set", expired: "Permit expired", "deadline-missed": "Application deadline passed", "application-open": "Applications open", "two-months": "Deadline within 2 months", "three-months": "Document review period", "six-months": "Renewal preparation period", safe: "Time before renewal" } as Record<string, string>)[status.level] ?? status.label)}</strong><small>{firearm.name} ・ {firearm.identifier}</small></div>
    <div className="permit-countdown-days"><span>{text("更新申請期限まで", "Renewal application deadline")}</span><strong>{countdown}</strong><small>{text("申請期限", "Deadline")} {firearm.renewalDeadline || text("未登録", "Not set")}　{text("有効期限", "Valid until")} {firearm.validUntil || text("未登録", "Not set")}</small></div>
  </button>;
}
