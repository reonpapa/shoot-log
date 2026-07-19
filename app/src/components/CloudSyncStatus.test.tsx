import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CloudSyncView } from "../hooks/useCloudSync";
import { CloudSyncStatus } from "./CloudSyncStatus";

function createView(changes: Partial<CloudSyncView> = {}): CloudSyncView {
  return { phase: "synced", email: "test@example.com", message: "クラウドと同期済み", lastSyncedAt: "2026-07-20T00:00:00.000Z", pendingChanges: 0, ...changes };
}

describe("同期状態表示", () => {
  it("未送信の変更があれば同期待ちを表示する", () => {
    const view = createView({ pendingChanges: 1 });
    const markup = renderToStaticMarkup(<CloudSyncStatus view={view} onSync={async () => undefined} />);
    expect(markup).toContain("同期待ち");
    expect(markup).toContain("1件");
  });

  it("オフラインとエラーを区別する", () => {
    const offline = renderToStaticMarkup(<CloudSyncStatus view={createView({ phase: "offline" })} onSync={async () => undefined} />);
    const error = renderToStaticMarkup(<CloudSyncStatus view={createView({ phase: "error" })} onSync={async () => undefined} />);
    expect(offline).toContain("オフライン");
    expect(error).toContain("要確認");
  });

  it("未ログイン時は履歴画面用パネルを表示しない", () => {
    const markup = renderToStaticMarkup(<CloudSyncStatus view={createView({ phase: "signed-out", email: "" })} onSync={async () => undefined} />);
    expect(markup).toBe("");
  });
});
