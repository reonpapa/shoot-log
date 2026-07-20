import type { SessionDetails } from "../domain/shooting";

type ShootingConditions = Pick<SessionDetails, "weather" | "temperature" | "windDirection" | "windStrength">;

export function formatShootingConditions(session: ShootingConditions): string {
  return [
    session.weather?.trim(),
    session.temperature?.trim() ? `${session.temperature.trim()}℃` : "",
    formatWindDirection(session.windDirection),
    session.windStrength?.trim(),
  ].filter(Boolean).join("・");
}

export function formatWindDirection(value?: string): string {
  const direction = value?.trim() ?? "";
  return {
    "向かい風": "向かい風↓",
    "追い風": "追い風↑",
    "左から": "左から→",
    "右から": "右から←",
    "変化あり": "変化あり↕",
  }[direction] ?? direction;
}
