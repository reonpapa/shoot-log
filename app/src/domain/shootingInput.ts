import type { Shot } from "./shooting";

export type ShotInput =
  | "hit-on-first"
  | "hit-on-second"
  | "miss-left"
  | "miss-center"
  | "miss-right"
  | "no-bird"
  | "skip";

export function applyShotInput(
  shot: Shot,
  input: ShotInput,
): Shot {
  switch (input) {
    case "hit-on-first":
      return {
        ...shot,
        firstShotResult: "hit",
        secondShotResult: "not-fired",
        finalResult: "hit-on-first",
        missDirection: undefined,
      };

    case "hit-on-second":
      return {
        ...shot,
        firstShotResult: "miss",
        secondShotResult: "hit",
        finalResult: "hit-on-second",
        missDirection: undefined,
      };

    case "miss-left":
      return createMissShot(shot, "left");

    case "miss-center":
      return createMissShot(shot, "center");

    case "miss-right":
      return createMissShot(shot, "right");

    case "no-bird":
      return {
        ...shot,
        firstShotResult: "not-fired",
        secondShotResult: "not-fired",
        finalResult: "no-bird",
        missDirection: undefined,
      };

    case "skip":
      return {
        ...shot,
        firstShotResult: "not-fired",
        secondShotResult: "not-fired",
        finalResult: "skip",
        missDirection: undefined,
      };
  }
}

function createMissShot(
  shot: Shot,
  direction: "left" | "center" | "right",
): Shot {
  return {
    ...shot,
    firstShotResult: "miss",
    secondShotResult: "miss",
    finalResult: "miss",
    missDirection: direction,
  };
}

export function getShotInput(shot: Shot): ShotInput {
  if (shot.finalResult === "hit-on-first") {
    return "hit-on-first";
  }

  if (shot.finalResult === "hit-on-second") {
    return "hit-on-second";
  }

  if (shot.finalResult === "no-bird") {
    return "no-bird";
  }

  if (shot.finalResult === "skip") {
    return "skip";
  }

  if (shot.missDirection === "left") {
    return "miss-left";
  }

  if (shot.missDirection === "right") {
    return "miss-right";
  }

  return "miss-center";
}
