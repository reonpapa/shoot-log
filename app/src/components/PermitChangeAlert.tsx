import { useState } from "react";
import type { Firearm } from "../domain/ammunition";
import { nearestPermit } from "../domain/permit";
import {
  createPermitStatusKey,
  PERMIT_NOTIFICATION_STORAGE_KEY,
  shouldShowPermitNotification,
} from "../services/permitNotification";
import "./PermitChangeAlert.css";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  firearms: Firearm[];
  onOpen: () => void;
}

export function PermitChangeAlert({ firearms, onOpen }: Props) {
  const { text } = useLanguage();
  const nearest = nearestPermit(firearms);
  const currentKey = nearest ? createPermitStatusKey(nearest.firearm.id, nearest.status.level) : "none";
  const [previousKey, setPreviousKey] = useState<string>(() => {
    const stored = localStorage.getItem(PERMIT_NOTIFICATION_STORAGE_KEY);
    if (stored !== null) return stored;
    localStorage.setItem(PERMIT_NOTIFICATION_STORAGE_KEY, currentKey);
    return currentKey;
  });

  if (!nearest || !shouldShowPermitNotification(previousKey, currentKey, nearest.status.level)) return null;

  function confirmAndOpen() {
    localStorage.setItem(PERMIT_NOTIFICATION_STORAGE_KEY, currentKey);
    setPreviousKey(currentKey);
    onOpen();
  }

  return <button className={`permit-change-alert ${nearest.status.level}`} onClick={confirmAndOpen}>
    <span aria-hidden="true">!</span>
    <div><strong>{text("所持許可の期限状況が変わりました", "Firearm permit deadline status changed")}</strong><small>{nearest.firearm.name}{text(" ・ ", " · ")}{text(nearest.status.label, ({ incomplete: "Schedule not set", expired: "Permit expired", "deadline-missed": "Deadline passed", "application-open": "Applications open", "two-months": "Within 2 months", "three-months": "Document review period", "six-months": "Preparation period", safe: "Time remaining" } as Record<string, string>)[nearest.status.level] ?? nearest.status.label)}{text("　", " · ")}{text("確認する →", "Review →")}</small></div>
  </button>;
}
