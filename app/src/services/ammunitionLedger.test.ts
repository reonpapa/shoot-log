import { describe, expect, it } from "vitest";
import { buildLedgerRows, getUnpostedConsumption, summarizePurchases } from "./ammunitionLedger";
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

describe("複数実包セッションの転記", () => {
  it("ラウンドごとの実包を実包区分別の消費行へ分けて転記する", () => {
    const ledger = createLedger();
    ledger.categories = [...ledger.categories, { id: "skeet-shell", name: "12番 スキート", family: "shot-shell" }];
    ledger.productLinks = [...ledger.productLinks, { ammunitionName: "Ammo B", categoryId: "skeet-shell" }];
    ledger.entries = [...ledger.entries, { id: "opening-2", date: "2026-07-01", type: "opening", categoryId: "skeet-shell", quantity: 50, application: "開始残弾", createdAt: "2026-07-01T00:00:00.000Z" }];
    const session = createStoredSession({
      ammunitionName: "Fiocchi TT TWO",
      ammunitionNames: ["Fiocchi TT TWO", "Ammo B"],
      rounds: [
        createRound({ roundNo: 1, finalResults: ["hit-on-first", "miss"] }),
        createRound({ roundNo: 2, ammunitionName: "Ammo B", finalResults: ["hit-on-first", "miss", "miss"] }),
      ],
    });

    const rows = buildLedgerRows(ledger, [session]);
    const sessionRows = rows.filter((row) => row.source === "session");

    expect(sessionRows).toHaveLength(2);
    expect(sessionRows.find((row) => row.categoryId === "trap-shell")).toMatchObject({ quantity: 2, signedQuantity: -2 });
    expect(sessionRows.find((row) => row.categoryId === "skeet-shell")).toMatchObject({ quantity: 3, signedQuantity: -3 });
    expect(rows.at(-1)?.totalAfter).toBe(145);
  });
});

describe("購入金額", () => {
  it("合計金額から1発あたりの単価を求める", () => {
    const ledger = createLedger();
    ledger.entries = [...ledger.entries, { id: "buy-1", date: "2026-07-05", type: "acquisition", categoryId: "trap-shell", quantity: 250, totalAmount: 12500, application: "〇〇銃砲店", createdAt: "2026-07-05T00:00:00.000Z" }];

    const row = buildLedgerRows(ledger, []).find((item) => item.id === "buy-1");

    expect(row).toMatchObject({ totalAmount: 12500, unitPrice: 50 });
  });

  it("期間内の購入金額と平均単価を集計する", () => {
    const ledger = createLedger();
    ledger.entries = [
      ...ledger.entries,
      { id: "buy-1", date: "2026-07-05", type: "acquisition", categoryId: "trap-shell", quantity: 250, totalAmount: 12500, application: "〇〇銃砲店", createdAt: "2026-07-05T00:00:00.000Z" },
      { id: "buy-2", date: "2026-08-05", type: "acquisition", categoryId: "trap-shell", quantity: 250, totalAmount: 15000, application: "〇〇銃砲店", createdAt: "2026-08-05T00:00:00.000Z" },
      { id: "buy-3", date: "2027-01-05", type: "acquisition", categoryId: "trap-shell", quantity: 250, totalAmount: 20000, application: "翌年分", createdAt: "2027-01-05T00:00:00.000Z" },
    ];

    const summary = summarizePurchases(ledger, "2026-01-01", "2026-12-31");

    expect(summary).toMatchObject({ entryCount: 2, quantity: 500, totalAmount: 27500, unitPrice: 55 });
    expect(summarizePurchases(ledger).totalAmount).toBe(47500);
  });

  it("金額のない購入行は集計しない", () => {
    const ledger = createLedger();
    ledger.entries = [...ledger.entries, { id: "buy-1", date: "2026-07-05", type: "acquisition", categoryId: "trap-shell", quantity: 250, application: "金額未入力", createdAt: "2026-07-05T00:00:00.000Z" }];

    expect(summarizePurchases(ledger)).toMatchObject({ entryCount: 0, totalAmount: 0, unitPrice: undefined });
  });
});

describe("帳簿区分が未設定の消費", () => {
  it("転記されなかった消費数を実包ごとに集計する", () => {
    const ledger = createLedger();
    const session = createStoredSession({
      ammunitionName: "Fiocchi TT TWO",
      ammunitionNames: ["Fiocchi TT TWO", "未登録実包"],
      rounds: [
        createRound({ roundNo: 1, finalResults: ["hit-on-first", "miss"] }),
        createRound({ roundNo: 2, ammunitionName: "未登録実包", finalResults: ["hit-on-first", "miss", "miss"] }),
      ],
    });

    const rows = buildLedgerRows(ledger, [session]);
    const unposted = getUnpostedConsumption(ledger, [session]);

    expect(rows.filter((row) => row.source === "session")).toHaveLength(1);
    expect(unposted).toEqual([{ ammunitionName: "未登録実包", quantity: 3, sessionCount: 1 }]);
  });

  it("すべて対応済みなら未転記はない", () => {
    expect(getUnpostedConsumption(createLedger(), [createStoredSession({})])).toEqual([]);
  });
});
