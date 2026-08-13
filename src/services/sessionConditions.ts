import type { SessionDetails } from "../domain/shooting";

type ShootingConditions = Pick<SessionDetails, "weather" | "temperature" | "windDirection" | "windStrength">;

export function formatShootingConditions(session: ShootingConditions, language: "ja" | "en" = "ja"): string {
  const translate = (value?: string) => language === "en" ? ({ "晴れ": "Sunny", "薄曇り": "Partly cloudy", "曇り": "Cloudy", "小雨": "Light rain", "雨": "Rain", "雪": "Snow", "霧": "Fog", "ほぼ無風": "Calm", "弱い": "Light", "普通": "Moderate", "強い": "Strong" } as Record<string, string>)[value?.trim() ?? ""] ?? value?.trim() : value?.trim();
  return [
    translate(session.weather),
    session.temperature?.trim() ? `${session.temperature.trim()}℃` : "",
    formatWindDirection(session.windDirection, language),
    translate(session.windStrength),
  ].filter(Boolean).join("・");
}

export function formatWindDirection(value?: string, language: "ja" | "en" = "ja"): string {
  const direction = value?.trim() ?? "";
  const japanese = {
    "向かい風": "向かい風↓",
    "追い風": "追い風↑",
    "左から": "左から→",
    "右から": "右から←",
    "変化あり": "変化あり↕",
  }[direction] ?? direction;
  if (language === "ja") return japanese;
  return ({ "向かい風": "Headwind ↓", "追い風": "Tailwind ↑", "左から": "From left →", "右から": "From right ←", "変化あり": "Variable ↕" } as Record<string, string>)[direction] ?? direction;
}
