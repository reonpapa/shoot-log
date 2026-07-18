import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  cloudPayloadData,
  cloudPayloadSignature,
  createCloudPayload,
  loadCloudSnapshot,
  mergeCloudPayload,
  saveCloudSnapshot,
  supabase,
  type CloudSnapshotPayload,
  type LocalDataSet,
} from "../services/cloudSync";

const META_KEY = "shoot-log.cloud-sync.v1";
const SAVE_DELAY_MS = 1_200;

interface LocalCloudMeta {
  userId: string;
  revision: number;
  lastSignature: string;
  lastSyncedAt: string;
  deletedSessions: Record<string, string>;
}

export type CloudSyncPhase = "signed-out" | "starting" | "syncing" | "synced" | "offline" | "error";

export interface CloudSyncView {
  phase: CloudSyncPhase;
  email: string;
  message: string;
  lastSyncedAt: string;
}

interface Options extends LocalDataSet {
  onApplyCloudData: (data: LocalDataSet) => void;
}

function readMeta(): LocalCloudMeta | null {
  try {
    const value = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as Partial<LocalCloudMeta> | null;
    if (!value || typeof value.userId !== "string" || typeof value.revision !== "number" || typeof value.lastSignature !== "string" || typeof value.lastSyncedAt !== "string") return null;
    const deletedSessions = value.deletedSessions && typeof value.deletedSessions === "object" ? value.deletedSessions : {};
    return { userId: value.userId, revision: value.revision, lastSignature: value.lastSignature, lastSyncedAt: value.lastSyncedAt, deletedSessions };
  } catch {
    return null;
  }
}

function writeMeta(meta: LocalCloudMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function errorMessage(error: unknown): string {
  if (!navigator.onLine) return "通信できないため端末内に保存しました。接続後に自動同期します。";
  if (error instanceof Error && error.message) return error.message;
  return "クラウド同期に失敗しました。";
}

export function useCloudSync({ sessions, masterData, ammunitionLedger, onApplyCloudData }: Options) {
  const [view, setView] = useState<CloudSyncView>({ phase: "signed-out", email: "", message: "クラウド同期を利用するにはログインしてください。", lastSyncedAt: "" });
  const dataRef = useRef<LocalDataSet>({ sessions, masterData, ammunitionLedger });
  const userRef = useRef<User | null>(null);
  const revisionRef = useRef(0);
  const deletedSessionsRef = useRef<Record<string, string>>({});
  const lastSignatureRef = useRef("");
  const readyRef = useRef(false);
  const initializedUserRef = useRef("");
  const initializingUserRef = useRef("");
  const savingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    dataRef.current = { sessions, masterData, ammunitionLedger };
  }, [sessions, masterData, ammunitionLedger]);

  const rememberSync = useCallback((user: User, revision: number, payload: CloudSnapshotPayload, updatedAt: string) => {
    const signature = cloudPayloadSignature(payload);
    revisionRef.current = revision;
    deletedSessionsRef.current = payload.deletedSessions;
    lastSignatureRef.current = signature;
    writeMeta({ userId: user.id, revision, lastSignature: signature, lastSyncedAt: updatedAt, deletedSessions: payload.deletedSessions });
    setView({ phase: "synced", email: user.email ?? "", message: "クラウドと同期済み", lastSyncedAt: updatedAt });
  }, []);

  const applyPayload = useCallback((payload: CloudSnapshotPayload) => {
    onApplyCloudData(cloudPayloadData(payload));
  }, [onApplyCloudData]);

  const savePayload = useCallback(async (user: User, payload: CloudSnapshotPayload, expectedRevision: number) => {
    const saved = await saveCloudSnapshot(payload, expectedRevision);
    rememberSync(user, saved.revision, saved.payload, saved.updatedAt);
    return saved;
  }, [rememberSync]);

  const reconcile = useCallback(async (user: User, localPayload: CloudSnapshotPayload) => {
    const remote = await loadCloudSnapshot();
    if (!remote) {
      const saved = await savePayload(user, localPayload, 0);
      return saved.payload;
    }
    const merged = mergeCloudPayload(localPayload, remote.payload);
    const mergedSignature = cloudPayloadSignature(merged);
    const remoteSignature = cloudPayloadSignature(remote.payload);
    if (mergedSignature === remoteSignature) {
      rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
      return remote.payload;
    }
    const saved = await savePayload(user, merged, remote.revision);
    return saved.payload;
  }, [rememberSync, savePayload]);

  const pushCurrent = useCallback(async () => {
    const user = userRef.current;
    if (!user || !readyRef.current || savingRef.current) return;
    const payload = createCloudPayload(dataRef.current, deletedSessionsRef.current);
    if (cloudPayloadSignature(payload) === lastSignatureRef.current) return;
    savingRef.current = true;
    setView((current) => ({ ...current, phase: "syncing", message: "クラウドへ保存中…" }));
    try {
      await savePayload(user, payload, revisionRef.current);
    } catch {
      try {
        const merged = await reconcile(user, payload);
        if (cloudPayloadSignature(merged) !== cloudPayloadSignature(payload)) applyPayload(merged);
      } catch (retryError) {
        const offline = !navigator.onLine;
        setView((current) => ({ ...current, phase: offline ? "offline" : "error", message: errorMessage(retryError) }));
      }
    } finally {
      savingRef.current = false;
    }
  }, [applyPayload, reconcile, savePayload]);

  const initializeForUser = useCallback(async (user: User) => {
    if (initializedUserRef.current === user.id || initializingUserRef.current === user.id) return;
    initializingUserRef.current = user.id;
    userRef.current = user;
    readyRef.current = false;
    setView({ phase: "starting", email: user.email ?? "", message: "初回データを確認中…", lastSyncedAt: "" });
    try {
      const meta = readMeta();
      deletedSessionsRef.current = meta?.userId === user.id ? meta.deletedSessions : {};
      const localPayload = createCloudPayload(dataRef.current, deletedSessionsRef.current);
      const localSignature = cloudPayloadSignature(localPayload);
      const remote = await loadCloudSnapshot();
      let finalPayload: CloudSnapshotPayload;

      if (!remote) {
        const saved = await savePayload(user, localPayload, 0);
        finalPayload = saved.payload;
      } else if (meta?.userId === user.id && meta.revision === remote.revision) {
        revisionRef.current = remote.revision;
        if (localSignature === meta.lastSignature) {
          rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
          finalPayload = remote.payload;
        } else {
          const saved = await savePayload(user, localPayload, remote.revision);
          finalPayload = saved.payload;
        }
      } else if (meta?.userId === user.id && localSignature === meta.lastSignature) {
        rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
        finalPayload = remote.payload;
      } else {
        finalPayload = await reconcile(user, localPayload);
      }

      if (cloudPayloadSignature(finalPayload) !== localSignature) applyPayload(finalPayload);
      initializedUserRef.current = user.id;
      readyRef.current = true;
    } catch (error) {
      const offline = !navigator.onLine;
      setView({ phase: offline ? "offline" : "error", email: user.email ?? "", message: errorMessage(error), lastSyncedAt: "" });
    } finally {
      initializingUserRef.current = "";
    }
  }, [applyPayload, reconcile, rememberSync, savePayload]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      void initializeForUser(data.session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        void initializeForUser(session.user);
      } else {
        userRef.current = null;
        readyRef.current = false;
        initializedUserRef.current = "";
        setView({ phase: "signed-out", email: "", message: "クラウド同期を利用するにはログインしてください。", lastSyncedAt: "" });
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [initializeForUser]);

  useEffect(() => {
    if (!readyRef.current || !userRef.current) return;
    const payload = createCloudPayload({ sessions, masterData, ammunitionLedger }, deletedSessionsRef.current);
    if (cloudPayloadSignature(payload) === lastSignatureRef.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { void pushCurrent(); }, SAVE_DELAY_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [sessions, masterData, ammunitionLedger, pushCurrent]);

  useEffect(() => {
    const resume = () => {
      if (userRef.current && !readyRef.current) void initializeForUser(userRef.current);
      else void pushCurrent();
    };
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    return () => {
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
    };
  }, [initializeForUser, pushCurrent]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.session ? "アカウントを作成し、ログインしました。" : "確認メールを送信しました。メール内のリンクを開いてください。";
  }, []);

  const signOut = useCallback(async () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    await pushCurrent();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [pushCurrent]);

  const syncNow = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    if (!readyRef.current) {
      initializedUserRef.current = "";
      await initializeForUser(user);
      return;
    }
    await pushCurrent();
  }, [initializeForUser, pushCurrent]);

  const recordSessionDeletion = useCallback((sessionId: string) => {
    const deletedSessions = { ...deletedSessionsRef.current, [sessionId]: new Date().toISOString() };
    deletedSessionsRef.current = deletedSessions;
    const user = userRef.current;
    const meta = readMeta();
    if (user && meta?.userId === user.id) writeMeta({ ...meta, deletedSessions });
  }, []);

  return { view, signIn, signUp, signOut, syncNow, recordSessionDeletion };
}
