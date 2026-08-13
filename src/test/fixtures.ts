import type { AmmunitionLedgerData } from "../domain/ammunition";
import type { FinalResult, ShootingRound, ShotResult } from "../domain/shooting";
import type { StoredSession } from "../services/storage";

interface RoundOptions {
  roundNo?: number;
  fireMode?: "single" | "double";
  finalResults?: FinalResult[];
  actualCartridgesUsed?: number;
}

export function createRound({
  roundNo = 1,
  fireMode = "single",
  finalResults = ["hit-on-first"],
  actualCartridgesUsed,
}: RoundOptions = {}): ShootingRound {
  return {
    id: `round-${roundNo}`,
    roundNo,
    startStandNo: 1,
    fireMode,
    ...(actualCartridgesUsed === undefined ? {} : { actualCartridgesUsed }),
    shots: finalResults.map((finalResult, index) => {
      let firstShotResult: ShotResult = "not-fired";
      let secondShotResult: ShotResult = "not-fired";
      if (finalResult === "hit-on-first") firstShotResult = "hit";
      if (finalResult === "hit-on-second") {
        firstShotResult = "miss";
        secondShotResult = "hit";
      }
      if (finalResult === "miss") {
        firstShotResult = "miss";
        secondShotResult = fireMode === "double" ? "miss" : "not-fired";
      }
      return {
        id: `shot-${roundNo}-${index + 1}`,
        targetNo: index + 1,
        standNo: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        firstShotResult,
        secondShotResult,
        finalResult,
        ...(finalResult === "miss" ? { missDirection: "left" as const } : {}),
      };
    }),
  };
}

interface SessionOptions {
  id?: string;
  status?: "draft" | "completed";
  updatedAt?: string;
  date?: string;
  ammunitionName?: string;
  rounds?: ShootingRound[];
}

export function createStoredSession({
  id = "session-1",
  status = "completed",
  updatedAt = "2026-07-19T00:00:00.000Z",
  date = "2026-07-19",
  ammunitionName = "Fiocchi TT TWO",
  rounds = [createRound()],
}: SessionOptions = {}): StoredSession {
  return {
    id,
    session: {
      date,
      rangeName: "大井射撃場",
      discipline: "trap",
      ammunitionName,
      weather: "晴れ",
      memo: "",
    },
    rounds,
    review: { findings: "", problems: "", nextChallenge: "" },
    status,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt,
  };
}

export function createLedger(): AmmunitionLedgerData {
  return {
    trackingStartDate: "2026-07-01",
    permitProfile: { certificateNumber: "", originalIssueDate: "", issueDate: "" },
    categories: [{ id: "trap-shell", name: "12番 トラップ", family: "shot-shell" }],
    firearms: [],
    productLinks: [{ ammunitionName: "Fiocchi TT TWO", categoryId: "trap-shell" }],
    entries: [{
      id: "opening-1",
      date: "2026-07-01",
      type: "opening",
      categoryId: "trap-shell",
      quantity: 100,
      application: "開始残弾",
      createdAt: "2026-07-01T00:00:00.000Z",
    }],
  };
}
