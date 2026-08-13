import { describe, expect, it, vi } from "vitest";
import { activateServiceWorkerUpdate, type ServiceWorkerUpdateTarget } from "./pwaUpdate";

const worker = (postMessage = vi.fn()) => ({ postMessage }) as unknown as ServiceWorker;

describe("PWA更新", () => {
  it("待機中のService Workerへ更新開始を通知する", async () => {
    const waiting = worker();
    const registration: ServiceWorkerUpdateTarget = { waiting, update: vi.fn() };
    await activateServiceWorkerUpdate(registration, null);
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("監視済みのWorkerがあればwaiting未反映でも更新できる", async () => {
    const observed = worker();
    const registration: ServiceWorkerUpdateTarget = { waiting: null, update: vi.fn() };
    await activateServiceWorkerUpdate(registration, observed);
    expect(observed.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("更新対象が取得できなければ明示的に失敗する", async () => {
    const registration: ServiceWorkerUpdateTarget = { waiting: null, update: vi.fn().mockResolvedValue(undefined) };
    await expect(activateServiceWorkerUpdate(registration, null)).rejects.toThrow("Waiting Service Worker is unavailable");
  });
});
