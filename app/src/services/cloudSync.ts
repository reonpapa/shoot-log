import { createClient } from "@supabase/supabase-js";
import type { AmmunitionLedgerData } from "../domain/ammunition";
import { createBackup, mergeMasterData, mergeSessions, parseBackup, type ShootLogBackup } from "./backup";
import { mergeAmmunitionLedger } from "./ammunitionLedger";
import type { MasterData } from "./masterData";
import type { StoredSession } from "./storage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Supabaseの接続情報が設定されていません。");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export interface LocalDataSet {
  sessions: StoredSession[];
  masterData: MasterData;
  ammunitionLedger: AmmunitionLedgerData;
}

export interface CloudSnapshotPayload extends ShootLogBackup {
  cloudSchemaVersion: 1;
  deletedSessions: Record<string, string>;
}

export interface CloudSnapshotRow {
  payload: CloudSnapshotPayload;
  revision: number;
  updatedAt: string;
}

function normalizeDeletedSessions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export function createCloudPayload(data: LocalDataSet, deletedSessions: Record<string, string>): CloudSnapshotPayload {
  return {
    ...createBackup(data.sessions, data.masterData, data.ammunitionLedger),
    cloudSchemaVersion: 1,
    deletedSessions,
  };
}

export function parseCloudPayload(value: unknown): CloudSnapshotPayload {
  const backup = parseBackup(JSON.stringify(value));
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    ...backup,
    cloudSchemaVersion: 1,
    deletedSessions: normalizeDeletedSessions(raw.deletedSessions),
  };
}

function mergeDeletedSessions(local: Record<string, string>, remote: Record<string, string>): Record<string, string> {
  const merged = { ...remote };
  for (const [id, deletedAt] of Object.entries(local)) {
    if (!merged[id] || deletedAt > merged[id]) merged[id] = deletedAt;
  }
  return merged;
}

export function mergeCloudPayload(local: CloudSnapshotPayload, remote: CloudSnapshotPayload): CloudSnapshotPayload {
  const deletedSessions = mergeDeletedSessions(local.deletedSessions, remote.deletedSessions);
  const sessions = mergeSessions(local.sessions, remote.sessions)
    .filter((session) => !deletedSessions[session.id] || session.updatedAt > deletedSessions[session.id]);
  return {
    app: "shoot-log",
    schemaVersion: 2,
    cloudSchemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sessions,
    masterData: mergeMasterData(local.masterData, remote.masterData),
    ammunitionLedger: mergeAmmunitionLedger(local.ammunitionLedger, remote.ammunitionLedger),
    deletedSessions,
  };
}

export function cloudPayloadData(payload: CloudSnapshotPayload): LocalDataSet {
  return { sessions: payload.sessions, masterData: payload.masterData, ammunitionLedger: payload.ammunitionLedger };
}

export function cloudPayloadSignature(payload: CloudSnapshotPayload): string {
  const source = JSON.stringify({
    sessions: payload.sessions,
    masterData: payload.masterData,
    ammunitionLedger: payload.ammunitionLedger,
    deletedSessions: Object.fromEntries(Object.entries(payload.deletedSessions).sort(([a], [b]) => a.localeCompare(b))),
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function loadCloudSnapshot(): Promise<CloudSnapshotRow | null> {
  const { data, error } = await supabase
    .from("shoot_log_snapshots")
    .select("payload, revision, updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    payload: parseCloudPayload(data.payload),
    revision: Number(data.revision),
    updatedAt: String(data.updated_at),
  };
}

export async function saveCloudSnapshot(payload: CloudSnapshotPayload, expectedRevision: number): Promise<CloudSnapshotRow> {
  const { data, error } = await supabase.rpc("save_shoot_log_snapshot", {
    p_payload: payload,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;
  if (!data) throw new Error("クラウド保存結果を取得できませんでした。");
  const row = Array.isArray(data) ? data[0] : data;
  return {
    payload: parseCloudPayload(row.payload),
    revision: Number(row.revision),
    updatedAt: String(row.updated_at),
  };
}
