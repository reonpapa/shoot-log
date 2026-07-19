import { describe, expect, it } from "vitest";
import { CloudSyncConflictError, createCloudPayload, isCloudSyncConflict, mergeCloudPayload } from "./cloudSync";
import { createLedger, createStoredSession } from "../test/fixtures";

const dataSet = (sessions: ReturnType<typeof createStoredSession>[]) => ({
  sessions,
  masterData: { rangeNames: ["大井射撃場"], ammunitionNames: ["Fiocchi TT TWO"] },
  ammunitionLedger: createLedger(),
});

describe("クラウド同期の競合解決", () => {
  it("削除日時より古いセッションを復活させない", () => {
    const session = createStoredSession({ updatedAt: "2026-07-19T00:00:00.000Z" });
    const local = createCloudPayload(dataSet([]), {
      [session.id]: "2026-07-19T01:00:00.000Z",
    });
    const remote = createCloudPayload(dataSet([session]), {});

    const merged = mergeCloudPayload(local, remote);

    expect(merged.sessions).toHaveLength(0);
    expect(merged.deletedSessions[session.id]).toBe("2026-07-19T01:00:00.000Z");
  });

  it("削除後に更新されたセッションは新しい編集として保持する", () => {
    const session = createStoredSession({ updatedAt: "2026-07-19T02:00:00.000Z" });
    const local = createCloudPayload(dataSet([]), {
      [session.id]: "2026-07-19T01:00:00.000Z",
    });
    const remote = createCloudPayload(dataSet([session]), {});

    const merged = mergeCloudPayload(local, remote);

    expect(merged.sessions.map((item) => item.id)).toEqual([session.id]);
  });

  it("端末間で同じセッションがある場合は新しい更新を採用する", () => {
    const older = createStoredSession({ updatedAt: "2026-07-19T00:00:00.000Z" });
    const newer = createStoredSession({ updatedAt: "2026-07-19T01:00:00.000Z" });

    const merged = mergeCloudPayload(
      createCloudPayload(dataSet([older]), {}),
      createCloudPayload(dataSet([newer]), {}),
    );

    expect(merged.sessions).toHaveLength(1);
    expect(merged.sessions[0].updatedAt).toBe(newer.updatedAt);
  });

  it("新旧どちらの競合応答も判定できる", () => {
    expect(isCloudSyncConflict(new CloudSyncConflictError())).toBe(true);
    expect(isCloudSyncConflict({ code: "40001", message: "SYNC_CONFLICT" })).toBe(true);
    expect(isCloudSyncConflict(new Error("ネットワークエラー"))).toBe(false);
  });
});
