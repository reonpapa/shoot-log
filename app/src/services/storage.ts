import type { SessionDraft } from "../components/SessionForm";
import type { ShootingRound } from "../domain/shooting";

const STORAGE_KEY = "shoot-log.app-state.v1";

export interface StoredAppState {
  session: SessionDraft | null;
  round: ShootingRound | null;
}

export function loadAppState(): StoredAppState | null {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    return JSON.parse(storedValue) as StoredAppState;
  } catch {
    return null;
  }
}

export function saveAppState(state: StoredAppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存失敗時も入力操作は継続させる
  }
}

export function clearAppState(): void {
  localStorage.removeItem(STORAGE_KEY);
}