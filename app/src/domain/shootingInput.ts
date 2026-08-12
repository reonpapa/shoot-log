import type { Shot } from "./shooting";

export type ShotInput = "hit-on-first" | "hit-on-first-second-fired" | "hit-on-second" | "miss-left" | "miss-center" | "miss-right" | "skip";

export function getNextShotIndex(currentIndex: number, shotCount: number): number {
  if (shotCount <= 0) return 0;
  return Math.min(Math.max(0, shotCount - 1), Math.max(0, currentIndex + 1));
}

export function applyShotInput(shot: Shot, input: ShotInput): Shot {
  if (input === "hit-on-first") return { ...shot, firstShotResult: "hit", secondShotResult: "not-fired", secondShotFiredAfterFirstHit: undefined, finalResult: input, missDirection: undefined };
  if (input === "hit-on-first-second-fired") return { ...shot, firstShotResult: "hit", secondShotResult: "not-fired", secondShotFiredAfterFirstHit: true, finalResult: "hit-on-first", missDirection: undefined };
  if (input === "hit-on-second") return { ...shot, firstShotResult: "miss", secondShotResult: "hit", secondShotFiredAfterFirstHit: undefined, finalResult: input, missDirection: undefined };
  if (input === "skip") return { ...shot, firstShotResult: "not-fired", secondShotResult: "not-fired", secondShotFiredAfterFirstHit: undefined, finalResult: input, missDirection: undefined };
  const missDirection = input.replace("miss-", "") as "left" | "center" | "right";
  return { ...shot, firstShotResult: "miss", secondShotResult: "miss", secondShotFiredAfterFirstHit: undefined, finalResult: "miss", missDirection };
}

export function getShotInput(shot: Shot): ShotInput {
  if (shot.finalResult === "hit-on-first" && shot.secondShotFiredAfterFirstHit) return "hit-on-first-second-fired";
  if (shot.finalResult !== "miss") return shot.finalResult;
  return `miss-${shot.missDirection ?? "center"}` as ShotInput;
}
