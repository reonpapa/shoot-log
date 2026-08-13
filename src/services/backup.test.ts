import { describe, expect, it } from "vitest";
import { createBackup, mergeSessions, parseBackup } from "./backup";
import { createLedger, createRound, createStoredSession } from "../test/fixtures";

const masterData = {
  rangeNames: ["大井射撃場"],
  ammunitionNames: ["Fiocchi TT TWO"],
};

describe("バックアップと復元", () => {
  it("同じセッションは更新日時が新しい方を採用する", () => {
    const current = createStoredSession({
      id: "same-session",
      updatedAt: "2026-07-19T00:00:00.000Z",
      rounds: [createRound({ finalResults: ["miss"] })],
    });
    const imported = createStoredSession({
      id: "same-session",
      updatedAt: "2026-07-19T01:00:00.000Z",
      rounds: [createRound({ finalResults: ["hit-on-first"] })],
    });

    const merged = mergeSessions([current], [imported]);

    expect(merged).toHaveLength(1);
    expect(merged[0].updatedAt).toBe(imported.updatedAt);
    expect(merged[0].rounds[0].shots[0].finalResult).toBe("hit-on-first");
  });

  it("生成したバックアップを正規化して復元できる", () => {
    const session = createStoredSession({
      rounds: [createRound({ finalResults: Array.from({ length: 25 }, () => "hit-on-first") })],
    });
    const backup = createBackup([session], masterData, createLedger());

    const restored = parseBackup(JSON.stringify(backup));

    expect(restored.schemaVersion).toBe(2);
    expect(restored.sessions).toHaveLength(1);
    expect(restored.ammunitionLedger.entries[0].quantity).toBe(100);
  });

  it("Shoot Log以外のJSONを拒否する", () => {
    expect(() => parseBackup('{"app":"other","schemaVersion":2,"sessions":[]}'))
      .toThrow("Shoot Logのバックアップではありません。");
  });
});
