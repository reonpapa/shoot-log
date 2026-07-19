import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { emptyAmmunitionLedger } from "../domain/ammunition";
import {
  cloudPayloadData,
  cloudPayloadSignature,
  checkCloudAvailability,
  createCloudPayload,
  isCloudSyncConflict,
  loadCloudSnapshot,
  mergeCloudPayload,
  saveCloudSnapshot,
  supabase,
  type CloudSnapshotPayload,
  type LocalDataSet,
} from "../services/cloudSync";

const META_KEY = "shoot-log.cloud-sync.v1";
const HEALTH_META_KEY = "shoot-log.cloud-health.v1";
const SAVE_DELAY_MS = 1_200;
const HEALTH_INTERVAL_MS = 6 * 60 * 60 * 1_000;
const HEALTH_RESUME_INTERVAL_MS = 5 * 60 * 1_000;
const CLOUD_SYNC_LOCK_NAME = "shoot-log-cloud-sync";

async function withCloudSyncLock<T>(operation: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return operation();
  return navigator.locks.request(CLOUD_SYNC_LOCK_NAME, operation);
}

function emptyLocalData(): LocalDataSet {
  return {
    sessions: [],
    masterData: { rangeNames: [], ammunitionNames: [] },
    ammunitionLedger: emptyAmmunitionLedger(),
  };
}

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

export type CloudHealthStatus = "checking" | "healthy" | "offline" | "error";

export interface CloudHealthView {
  status: CloudHealthStatus;
  message: string;
  lastCheckedAt: string;
  lastHealthyAt: string;
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

function readHealthMeta(): Pick<CloudHealthView, "lastCheckedAt" | "lastHealthyAt"> {
  try {
    const value = JSON.parse(localStorage.getItem(HEALTH_META_KEY) ?? "null") as Partial<CloudHealthView> | null;
    return {
      lastCheckedAt: typeof value?.lastCheckedAt === "string" ? value.lastCheckedAt : "",
      lastHealthyAt: typeof value?.lastHealthyAt === "string" ? value.lastHealthyAt : "",
    };
  } catch {
    return { lastCheckedAt: "", lastHealthyAt: "" };
  }
}

function writeHealthMeta(health: Pick<CloudHealthView, "lastCheckedAt" | "lastHealthyAt">): void {
  localStorage.setItem(HEALTH_META_KEY, JSON.stringify(health));
}

function errorMessage(error: unknown): string {
  if (!navigator.onLine) return "通信できないため端末内に保存しました。接続後に自動同期します。";
  if (isCloudSyncConflict(error)) return "別の端末の更新と重なりました。数秒後に「今すぐ同期」を押してください。";
  if (error instanceof Error && error.message) return error.message;
  return "クラウド同期に失敗しました。";
}

function appRedirectUrl(passwordRecovery = false): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  if (passwordRecovery) url.searchParams.set("password-recovery", "1");
  return url.toString();
}

function clearPasswordRecoveryUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("password-recovery");
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export function useCloudSync({ sessions, masterData, ammunitionLedger, onApplyCloudData }: Options) {
  const [view, setView] = useState<CloudSyncView>({ phase: "signed-out", email: "", message: "クラウド同期を利用するにはログインしてください。", lastSyncedAt: "" });
  const [health, setHealth] = useState<CloudHealthView>(() => {
    const stored = readHealthMeta();
    return { status: "checking", message: "Supabaseへの接続を確認しています…", ...stored };
  });
  const [passwordRecovery, setPasswordRecovery] = useState(() => new URLSearchParams(window.location.search).get("password-recovery") === "1");
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
  const healthCheckingRef = useRef(false);
  const lastHealthAttemptRef = useRef(0);

  useEffect(() => {
    dataRef.current = { sessions, masterData, ammunitionLedger };
  }, [sessions, masterData, ammunitionLedger]);

  const checkHealth = useCallback(async () => {
    if (healthCheckingRef.current) return;
    healthCheckingRef.current = true;
    lastHealthAttemptRef.current = Date.now();
    const checkedAt = new Date().toISOString();
    setHealth((current) => ({ ...current, status: "checking", message: "Supabaseへの接続を確認しています…" }));
    try {
      if (!navigator.onLine) throw new Error("OFFLINE");
      await checkCloudAvailability();
      const next: CloudHealthView = { status: "healthy", message: "Supabaseは正常に応答しています。", lastCheckedAt: checkedAt, lastHealthyAt: checkedAt };
      setHealth(next);
      writeHealthMeta(next);
    } catch {
      const offline = !navigator.onLine;
      setHealth((current) => {
        const next: CloudHealthView = {
          ...current,
          status: offline ? "offline" : "error",
          message: offline ? "通信環境を確認後、自動的に再確認します。" : "Supabaseから応答を取得できませんでした。時間をおいて再確認します。",
          lastCheckedAt: checkedAt,
        };
        writeHealthMeta(next);
        return next;
      });
    } finally {
      healthCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const checkWhenDue = () => {
      if (Date.now() - lastHealthAttemptRef.current >= HEALTH_RESUME_INTERVAL_MS) void checkHealth();
    };
    const checkWhenOnline = () => { void checkHealth(); };
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkWhenDue();
    };
    const interval = window.setInterval(() => { void checkHealth(); }, HEALTH_INTERVAL_MS);
    window.addEventListener("focus", checkWhenDue);
    window.addEventListener("online", checkWhenOnline);
    window.addEventListener("pageshow", checkWhenDue);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkWhenDue);
      window.removeEventListener("online", checkWhenOnline);
      window.removeEventListener("pageshow", checkWhenDue);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [checkHealth]);

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
    await withCloudSyncLock(async () => {
      const user = userRef.current;
      if (!user || !readyRef.current || savingRef.current) return;
      const payload = createCloudPayload(dataRef.current, deletedSessionsRef.current);
      if (cloudPayloadSignature(payload) === lastSignatureRef.current) return;
      savingRef.current = true;
      setView((current) => ({ ...current, phase: "syncing", message: "クラウドへ保存中…" }));
      try {
        await savePayload(user, payload, revisionRef.current);
      } catch (error) {
        if (!isCloudSyncConflict(error)) {
          const offline = !navigator.onLine;
          setView((current) => ({ ...current, phase: offline ? "offline" : "error", message: errorMessage(error) }));
          return;
        }
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
    });
  }, [applyPayload, reconcile, savePayload]);

  const initializeForUser = useCallback(async (user: User) => {
    if (initializedUserRef.current === user.id || initializingUserRef.current === user.id) return;
    initializingUserRef.current = user.id;
    userRef.current = user;
    readyRef.current = false;
    setView({ phase: "starting", email: user.email ?? "", message: "初回データを確認中…", lastSyncedAt: "" });
    try {
      await withCloudSyncLock(async () => {
        const meta = readMeta();
        deletedSessionsRef.current = meta?.userId === user.id ? meta.deletedSessions : {};
        const localPayload = createCloudPayload(dataRef.current, deletedSessionsRef.current);
        const localSignature = cloudPayloadSignature(localPayload);
        const remote = await loadCloudSnapshot();
        let finalPayload: CloudSnapshotPayload;

        if (meta && meta.userId !== user.id) {
          if (remote) {
            rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
            finalPayload = remote.payload;
          } else {
            const saved = await savePayload(user, createCloudPayload(emptyLocalData(), {}), 0);
            finalPayload = saved.payload;
          }
        } else if (!remote) {
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
      });
    } catch (error) {
      const offline = !navigator.onLine;
      setView({ phase: offline ? "offline" : "error", email: user.email ?? "", message: errorMessage(error), lastSyncedAt: "" });
    } finally {
      initializingUserRef.current = "";
    }
  }, [applyPayload, reconcile, rememberSync, savePayload]);

  const pullLatest = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    if (!readyRef.current) {
      initializedUserRef.current = "";
      await initializeForUser(user);
      return;
    }
    await withCloudSyncLock(async () => {
      if (savingRef.current || !readyRef.current) return;

      savingRef.current = true;
      setView((current) => ({ ...current, phase: "syncing", message: "クラウドの最新データを確認中…" }));
      try {
        const localPayload = createCloudPayload(dataRef.current, deletedSessionsRef.current);
        const localSignature = cloudPayloadSignature(localPayload);
        const remote = await loadCloudSnapshot();

        if (!remote) {
          await savePayload(user, localPayload, 0);
        } else if (remote.revision === revisionRef.current) {
          if (localSignature === lastSignatureRef.current) {
            rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
          } else {
            await savePayload(user, localPayload, remote.revision);
          }
        } else if (localSignature === lastSignatureRef.current) {
          rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
          if (cloudPayloadSignature(remote.payload) !== localSignature) applyPayload(remote.payload);
        } else {
          const merged = mergeCloudPayload(localPayload, remote.payload);
          const mergedSignature = cloudPayloadSignature(merged);
          const remoteSignature = cloudPayloadSignature(remote.payload);
          if (mergedSignature === remoteSignature) {
            rememberSync(user, remote.revision, remote.payload, remote.updatedAt);
          } else {
            const saved = await savePayload(user, merged, remote.revision);
            if (cloudPayloadSignature(saved.payload) !== localSignature) applyPayload(saved.payload);
          }
        }
      } catch (error) {
        const offline = !navigator.onLine;
        setView((current) => ({ ...current, phase: offline ? "offline" : "error", message: errorMessage(error) }));
      } finally {
        savingRef.current = false;
      }
    });
  }, [applyPayload, initializeForUser, rememberSync, savePayload]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      void initializeForUser(data.session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
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
      void pullLatest();
    };
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    return () => {
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
    };
  }, [pullLatest]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const emailRedirectTo = appRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) throw error;
    return data.session ? "アカウントを作成し、ログインしました。" : "確認メールを送信しました。メール内のリンクを開いてください。";
  }, []);

  const signOut = useCallback(async () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    await pushCurrent();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setPasswordRecovery(false);
  }, [pushCurrent]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appRedirectUrl(true),
    });
    if (error) throw error;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    if (error) throw error;
  }, []);

  const completePasswordRecovery = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setPasswordRecovery(false);
    clearPasswordRecoveryUrl();
  }, []);

  const syncNow = useCallback(async () => {
    await pullLatest();
  }, [pullLatest]);

  const deleteAccount = useCallback(async () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const { error } = await supabase.rpc("delete_shoot_log_account");
    if (error) throw error;
    await supabase.auth.signOut({ scope: "local" });
  }, []);

  const recordSessionDeletion = useCallback((sessionId: string) => {
    const deletedSessions = { ...deletedSessionsRef.current, [sessionId]: new Date().toISOString() };
    deletedSessionsRef.current = deletedSessions;
    const user = userRef.current;
    const meta = readMeta();
    if (user && meta?.userId === user.id) writeMeta({ ...meta, deletedSessions });
  }, []);

  return { view, health, passwordRecovery, signIn, signUp, signOut, sendPasswordReset, changePassword, completePasswordRecovery, syncNow, checkHealth, deleteAccount, recordSessionDeletion };
}
