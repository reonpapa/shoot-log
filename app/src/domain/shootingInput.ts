import type { Shot } from "./shooting";

export type ShotInput = "hit-on-first" | "hit-on-second" | "miss-left" | "miss-center" | "miss-right" | "skip";

export function getNextShotIndex(currentIndex: number, shotCount: number): number {
  if (shotCount <= 0) return 0;
  return Math.min(Math.max(0, shotCount - 1), Math.max(0, currentIndex + 1));
}

export function applyShotInput(shot: Shot, input: ShotInput): Shot {
  if (input === "hit-on-first") return { ...shot, firstShotResult: "hit", secondShotResult: "not-fired", finalResult: input, missDirection: undefined };
  if (input === "hit-on-second") return { ...shot, firstShotResult: "miss", secondShotResult: "hit", finalResult: input, missDirection: undefined };
  if (input === "skip") return { ...shot, firstShotResult: "not-fired", secondShotResult: "not-fired", finalResult: input, missDirection: undefined };
  const missDirection = input.replace("miss-", "") as "left" | "center" | "right";
  return { ...shot, firstShotResult: "miss", secondShotResult: "miss", finalResult: "miss", missDirection };
}

export function getShotInput(shot: Shot): ShotInput {
  if (shot.finalResult !== "miss") return shot.finalResult;
  return `miss-${shot.missDirection ?? "center"}` as ShotInput;
}
