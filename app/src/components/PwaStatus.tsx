import { useEffect, useRef, useState } from "react";
import { recoverPwaShell } from "../services/pwaRecovery";
import { activateServiceWorkerUpdate } from "../services/pwaUpdate";
import "./PwaStatus.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface IosNavigator extends Navigator {
  standalone?: boolean;
}

type Notice = "offline-ready" | "update" | null;
type UpdateState = "idle" | "updating" | "failed";

function shouldSuggestIosInstall() {
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as IosNavigator).standalone === true;
  return isIos && !isStandalone && localStorage.getItem("shoot-log-ios-install-dismissed") !== "1";
}

export function PwaStatus() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIosInstall, setShowIosInstall] = useState(shouldSuggestIosInstall);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadAfterUpdateRef = useRef(false);
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;

    const watchWorker = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        if (disposed || worker.state !== "installed") return;
        if (navigator.serviceWorker.controller) {
          waitingWorkerRef.current = worker;
          setUpdateState("idle");
          setNotice("update");
        } else {
          setNotice("offline-ready");
        }
      });
    };

    const reloadAfterUpdate = () => {
      if (reloadAfterUpdateRef.current) window.location.reload();
    };

    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", reloadAfterUpdate);
      const baseUrl = import.meta.env.BASE_URL;
      navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl, updateViaCache: "none" }).then((registration) => {
        if (disposed) return;
        registrationRef.current = registration;
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = registration.waiting;
          setNotice("update");
        }
        if (registration.installing) watchWorker(registration.installing);
        registration.addEventListener("updatefound", () => {
          if (registration.installing) watchWorker(registration.installing);
        });
        if (navigator.serviceWorker.controller) void registration.update();
      }).catch((error: unknown) => {
        console.error("PWA registration failed", error);
      });
    }

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") void registrationRef.current?.update();
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => {
      disposed = true;
      if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterUpdate);
      if (reloadTimerRef.current !== null) window.clearTimeout(reloadTimerRef.current);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("focus", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  useEffect(() => {
    if (notice !== "offline-ready") return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function applyUpdate() {
    if (updateState === "updating") return;
    setUpdateState("updating");
    try {
      const registration = registrationRef.current;
      if (!registration) throw new Error("Service Worker registration is unavailable");
      reloadAfterUpdateRef.current = true;
      await activateServiceWorkerUpdate(registration, waitingWorkerRef.current);
      reloadTimerRef.current = window.setTimeout(() => void recoverPwaShell(), 2500);
    } catch (error) {
      console.error("PWA update failed", error);
      reloadAfterUpdateRef.current = false;
      try {
        await recoverPwaShell();
      } catch (recoveryError) {
        console.error("PWA recovery failed", recoveryError);
        setUpdateState("failed");
      }
    }
  }

  function dismissIosInstall() {
    localStorage.setItem("shoot-log-ios-install-dismissed", "1");
    setShowIosInstall(false);
  }

  if (!installPrompt && !notice && !showIosInstall && isOnline) return null;

  return <aside className="pwa-status" aria-live="polite">
    {!isOnline && <span className="pwa-status__message">オフラインで使用中</span>}
    {isOnline && notice === "offline-ready" && <span className="pwa-status__message">オフライン利用の準備ができました</span>}
    {isOnline && notice === null && showIosInstall && <>
      <span className="pwa-status__message">iPhone：Safariの共有から「ホーム画面に追加」</span>
      <button className="pwa-status__dismiss" aria-label="案内を閉じる" onClick={dismissIosInstall}>×</button>
    </>}
    {isOnline && notice === "update" && <>
      <span className="pwa-status__message">{updateState === "updating" ? "更新しています…" : updateState === "failed" ? "自動更新できませんでした。画面を再読み込みしてください" : "新しいバージョンがあります"}</span>
      {updateState !== "failed" && <button type="button" className="pwa-status__primary" disabled={updateState === "updating"} onClick={() => void applyUpdate()}>{updateState === "updating" ? "更新中" : "更新する"}</button>}
      {updateState === "failed" && <button type="button" className="pwa-status__primary" onClick={() => void recoverPwaShell()}>アプリを安全に復旧</button>}
      <button type="button" className="pwa-status__dismiss" aria-label="更新通知を閉じる" onClick={() => { setNotice(null); setUpdateState("idle"); }}>×</button>
    </>}
    {isOnline && notice === null && !showIosInstall && installPrompt && <button className="pwa-status__primary" onClick={() => void install()}>この端末にインストール</button>}
    {isOnline && notice === "offline-ready" && <button className="pwa-status__dismiss" aria-label="通知を閉じる" onClick={() => setNotice(null)}>×</button>}
  </aside>;
}
