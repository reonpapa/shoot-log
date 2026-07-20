export interface ServiceWorkerUpdateTarget {
  waiting: ServiceWorker | null;
  update: () => Promise<unknown>;
}

export async function activateServiceWorkerUpdate(
  registration: ServiceWorkerUpdateTarget,
  observedWorker: ServiceWorker | null,
): Promise<ServiceWorker> {
  let worker = registration.waiting ?? observedWorker;
  if (!worker) {
    await registration.update();
    worker = registration.waiting;
  }
  if (!worker) throw new Error("Waiting Service Worker is unavailable");
  worker.postMessage({ type: "SKIP_WAITING" });
  return worker;
}
