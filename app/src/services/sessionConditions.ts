import type { SessionDetails } from "../domain/shooting";

type ShootingConditions = Pick<SessionDetails, "weather" | "temperature" | "windDirection" | "windStrength">;

export function formatShootingConditions(session: ShootingConditions): string {
  return [
    session.weather?.trim(),
    session.temperature?.trim() ? `${session.temperature.trim()}℃` : "",
    session.windDirection?.trim(),
    session.windStrength?.trim(),
  ].filter(Boolean).join("・");
}
