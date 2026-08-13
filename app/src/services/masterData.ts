import type { SessionDetails } from "../domain/shooting";
import type { TrapSetting } from "../domain/shooting";

const STORAGE_KEY = "shoot-log.master-data.v1";

export interface MasterData {
  rangeNames: string[];
  ammunitionNames: string[];
  rangeTrapSettings: RangeTrapSetting[];
}

export interface RangeTrapSetting extends TrapSetting { id: string }

export const DEFAULT_RANGE_TRAP_SETTINGS: RangeTrapSetting[] = [
  { id: "isehara-t1", rangeName: "神奈川県立伊勢原射撃場", face: "第1面", setType: "ISSF国際セット", distanceMeters: 76, speedKmh: 98, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "isehara-t2", rangeName: "神奈川県立伊勢原射撃場", face: "第2面", setType: "練習セット", distanceMeters: 55, speedKmh: 78, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "isehara-t3", rangeName: "神奈川県立伊勢原射撃場", face: "第3面", setType: "ISSF国際セット等", distanceMeters: 65, speedKmh: 95, confirmedOn: "2025-07-27", note: "設定目安。必ず当日の掲示を確認してください。" },
  { id: "ooi-international", rangeName: "神奈川大井射撃場", face: "国際射面", setType: "国際セット", distanceMeters: 76, note: "公式掲載値76m±1m。速度は未設定。必ず当日の掲示を確認してください。" },
  { id: "ooi-american", rangeName: "神奈川大井射撃場", face: "アメリカン射面", setType: "アメリカンセット", distanceMeters: 60, note: "公式掲載値60m±1m。速度は未設定。必ず当日の掲示を確認してください。" },
];

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));

export function loadMasterData(): MasterData {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<MasterData>;
    const settings = Array.isArray(parsed.rangeTrapSettings) ? parsed.rangeTrapSettings : DEFAULT_RANGE_TRAP_SETTINGS;
    return { rangeNames: unique([...(parsed.rangeNames ?? []), ...settings.map((item) => item.rangeName)]), ammunitionNames: unique(parsed.ammunitionNames ?? []), rangeTrapSettings: settings };
  } catch {
    return { rangeNames: unique(DEFAULT_RANGE_TRAP_SETTINGS.map((item) => item.rangeName)), ammunitionNames: [], rangeTrapSettings: DEFAULT_RANGE_TRAP_SETTINGS };
  }
}

export function saveMasterData(masterData: MasterData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(masterData));
}

export function addSessionToMasterData(masterData: MasterData, session: SessionDetails): MasterData {
  return {
    rangeNames: unique([...masterData.rangeNames, session.rangeName]),
    ammunitionNames: unique([...masterData.ammunitionNames, session.ammunitionName]),
    rangeTrapSettings: masterData.rangeTrapSettings,
  };
}

export function normalizeMasterData(value: Partial<MasterData>): MasterData {
  const settings = Array.isArray(value.rangeTrapSettings) ? value.rangeTrapSettings : DEFAULT_RANGE_TRAP_SETTINGS;
  return { rangeNames: unique([...(value.rangeNames ?? []), ...settings.map((item) => item.rangeName)]), ammunitionNames: unique(value.ammunitionNames ?? []), rangeTrapSettings: settings };
}
