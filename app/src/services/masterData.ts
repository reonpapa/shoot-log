import type { SessionDetails } from "../domain/shooting";

const STORAGE_KEY = "shoot-log.master-data.v1";

export interface MasterData {
  rangeNames: string[];
  ammunitionNames: string[];
}

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));

export function loadMasterData(): MasterData {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<MasterData>;
    return { rangeNames: unique(parsed.rangeNames ?? []), ammunitionNames: unique(parsed.ammunitionNames ?? []) };
  } catch {
    return { rangeNames: [], ammunitionNames: [] };
  }
}

export function saveMasterData(masterData: MasterData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(masterData));
}

export function addSessionToMasterData(masterData: MasterData, session: SessionDetails): MasterData {
  return {
    rangeNames: unique([...masterData.rangeNames, session.rangeName]),
    ammunitionNames: unique([...masterData.ammunitionNames, session.ammunitionName]),
  };
}
