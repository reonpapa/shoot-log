import type { SessionDetails } from "../domain/shooting";
import { getSessionAmmunitionNames } from "../domain/shooting";
import type { TrapSetting } from "../domain/shooting";

const STORAGE_KEY = "shoot-log.master-data.v1";

export interface MasterData {
  rangeNames: string[];
  ammunitionNames: string[];
  /** 射撃場ごとの射面（第1面など）。セットとは独立に管理する。 */
  rangeFaces: RangeFace[];
  /** クレーのセット（ISSF国際など）。射撃場をまたいで共通。 */
  trapSets: TrapSet[];
}

export interface RangeFace {
  id: string;
  rangeName: string;
  face: string;
  note?: string;
}

export interface TrapSet {
  id: string;
  name: string;
  distanceMeters?: number;
  speedKmh?: number;
  confirmedOn?: string;
  note?: string;
}

/** 旧形式：射面とセットが1件に固定されていた設定。読み込み時に分割する。 */
export interface RangeTrapSetting extends TrapSetting { id: string }

const PRESET_NOTE = "設定目安。必ず当日の掲示を確認してください。";

export const DEFAULT_RANGE_FACES: RangeFace[] = [
  { id: "isehara-f1", rangeName: "神奈川県立伊勢原射撃場", face: "第1面" },
  { id: "isehara-f2", rangeName: "神奈川県立伊勢原射撃場", face: "第2面" },
  { id: "isehara-f3", rangeName: "神奈川県立伊勢原射撃場", face: "第3面" },
  { id: "ooi-f1", rangeName: "神奈川大井射撃場", face: "国際射面" },
  { id: "ooi-f2", rangeName: "神奈川大井射撃場", face: "アメリカン射面" },
];

export const DEFAULT_TRAP_SETS: TrapSet[] = [
  { id: "set-issf", name: "ISSF国際セット", distanceMeters: 76, speedKmh: 98, confirmedOn: "2025-07-27", note: PRESET_NOTE },
  { id: "set-middle", name: "中間セット", distanceMeters: 65, speedKmh: 95, confirmedOn: "2025-07-27", note: PRESET_NOTE },
  { id: "set-practice", name: "練習セット", distanceMeters: 55, speedKmh: 78, confirmedOn: "2025-07-27", note: PRESET_NOTE },
  { id: "set-american", name: "アメリカンセット", distanceMeters: 60, note: "公式掲載値60m±1m。速度は未設定。必ず当日の掲示を確認してください。" },
];

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const optionalNumber = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const optionalText = (value: unknown): string | undefined => isText(value) ? value.trim() : undefined;

function normalizeFaces(value: unknown): RangeFace[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item): RangeFace[] => {
    if (!isRecord(item) || !isText(item.face)) return [];
    return [{
      id: isText(item.id) ? item.id : crypto.randomUUID(),
      rangeName: optionalText(item.rangeName) ?? "",
      face: item.face.trim(),
      ...(optionalText(item.note) ? { note: optionalText(item.note) as string } : {}),
    }];
  });
}

function normalizeSets(value: unknown): TrapSet[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item): TrapSet[] => {
    if (!isRecord(item) || !isText(item.name)) return [];
    const distanceMeters = optionalNumber(item.distanceMeters);
    const speedKmh = optionalNumber(item.speedKmh);
    return [{
      id: isText(item.id) ? item.id : crypto.randomUUID(),
      name: item.name.trim(),
      ...(distanceMeters === undefined ? {} : { distanceMeters }),
      ...(speedKmh === undefined ? {} : { speedKmh }),
      ...(optionalText(item.confirmedOn) ? { confirmedOn: optionalText(item.confirmedOn) as string } : {}),
      ...(optionalText(item.note) ? { note: optionalText(item.note) as string } : {}),
    }];
  });
}

/** 旧形式の設定を、射面の一覧とセットの一覧へ分割する。 */
export function splitLegacyTrapSettings(settings: RangeTrapSetting[]): { rangeFaces: RangeFace[]; trapSets: TrapSet[] } {
  const faces = new Map<string, RangeFace>();
  const sets = new Map<string, TrapSet>();
  for (const item of settings) {
    const face = (item.face ?? "").trim();
    const rangeName = (item.rangeName ?? "").trim();
    if (face) {
      const key = `${rangeName}|${face}`;
      if (!faces.has(key)) faces.set(key, { id: item.id || crypto.randomUUID(), rangeName, face });
    }
    const name = (item.setType ?? "").trim();
    if (!name) continue;
    const key = [name, item.distanceMeters ?? "", item.speedKmh ?? ""].join("|");
    if (!sets.has(key)) {
      sets.set(key, {
        id: `${item.id || crypto.randomUUID()}-set`,
        name,
        ...(item.distanceMeters === undefined ? {} : { distanceMeters: item.distanceMeters }),
        ...(item.speedKmh === undefined ? {} : { speedKmh: item.speedKmh }),
        ...(item.confirmedOn ? { confirmedOn: item.confirmedOn } : {}),
        ...(item.note ? { note: item.note } : {}),
      });
    }
  }
  return { rangeFaces: [...faces.values()], trapSets: [...sets.values()] };
}

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));

export function loadMasterData(): MasterData {
  try {
    return normalizeMasterData(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<MasterData>);
  } catch {
    return { rangeNames: unique(DEFAULT_RANGE_FACES.map((item) => item.rangeName)), ammunitionNames: [], rangeFaces: DEFAULT_RANGE_FACES, trapSets: DEFAULT_TRAP_SETS };
  }
}

export function saveMasterData(masterData: MasterData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(masterData));
}

export function addSessionToMasterData(masterData: MasterData, session: SessionDetails): MasterData {
  return {
    ...masterData,
    rangeNames: unique([...masterData.rangeNames, session.rangeName]),
    ammunitionNames: unique([...masterData.ammunitionNames, ...getSessionAmmunitionNames(session)]),
  };
}

export function normalizeMasterData(value: Partial<MasterData> & { rangeTrapSettings?: RangeTrapSetting[] }): MasterData {
  const storedFaces = normalizeFaces(value.rangeFaces);
  const storedSets = normalizeSets(value.trapSets);
  const legacy = Array.isArray(value.rangeTrapSettings) ? splitLegacyTrapSettings(value.rangeTrapSettings) : null;
  const rangeFaces = storedFaces ?? legacy?.rangeFaces ?? DEFAULT_RANGE_FACES;
  const trapSets = storedSets ?? legacy?.trapSets ?? DEFAULT_TRAP_SETS;
  return {
    rangeNames: unique([...(value.rangeNames ?? []), ...rangeFaces.map((item) => item.rangeName)]),
    ammunitionNames: unique(value.ammunitionNames ?? []),
    rangeFaces,
    trapSets,
  };
}
