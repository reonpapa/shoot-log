import { describe, expect, it } from "vitest";
import { buildLedgerRows } from "./ammunitionLedger";
import { createLedger, createRound, createStoredSession } from "../test/fixtures";

describe("実包台帳の自動反映", () => {
  it("完了セッションだけを消費行へ反映する", () => {
    const completed = createStoredSession({
      id: "completed",
      rounds: [createRound({ finalResults: ["hit-on-first", "miss"] })],
    });
    const draft = createStoredSession({
      id: "draft",
      status: "draft",
      rounds: [createRound({ finalResults: ["hit-on-first", "miss", "miss"] })],
    });

    const rows = buildLedgerRows(createLedger(), [completed, draft]);

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      id: "session:completed",
      source: "session",
      quantity: 2,
      signedQuantity: -2,
      totalAfter: 98,
    });
  });

  it("射撃履歴を削除すると自動消費行が消え、残弾が戻る", () => {
    const completed = createStoredSession({
      rounds: [createRound({ finalResults: ["hit-on-first", "miss"] })],
    });

    const beforeDelete = buildLedgerRows(createLedger(), [completed]);
    const afterDelete = buildLedgerRows(createLedger(), []);

    expect(beforeDelete.at(-1)?.totalAfter).toBe(98);
    expect(afterDelete.at(-1)?.totalAfter).toBe(100);
    expect(afterDelete.some((row) => row.source === "session")).toBe(false);
  });

  it("台帳開始日より前のセッションは反映しない", () => {
    const oldSession = createStoredSession({ date: "2026-06-30" });

    const rows = buildLedgerRows(createLedger(), [oldSession]);

    expect(rows).toHaveLength(1);
    expect(rows[0].totalAfter).toBe(100);
  });
});
