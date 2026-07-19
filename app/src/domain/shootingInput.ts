import type { Shot } from "./shooting";

export type ShotInput = "hit-on-first" | "hit-on-second" | "miss-left" | "miss-center" | "miss-right" | "skip";

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
