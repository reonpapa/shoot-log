import { useState } from "react";
import type { Firearm } from "../domain/ammunition";
import { nearestPermit } from "../domain/permit";
import {
  createPermitStatusKey,
  PERMIT_NOTIFICATION_STORAGE_KEY,
  shouldShowPermitNotification,
} from "../services/permitNotification";
import "./PermitChangeAlert.css";

interface Props {
  firearms: Firearm[];
  onOpen: () => void;
}

export function PermitChangeAlert({ firearms, onOpen }: Props) {
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
    <div><strong>所持許可の期限状況が変わりました</strong><small>{nearest.firearm.name} ・ {nearest.status.label}　確認する →</small></div>
  </button>;
}
