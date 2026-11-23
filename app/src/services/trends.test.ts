import { describe, expect, it } from "vitest";
import { createLedger, createRound, createStoredSession } from "../test/fixtures";
import { getMonthlyAmmunition, getSessionTrend, movingAverage } from "./trends";

const hits = (count: number) => Array.from({ length: count }, () => "hit-on-first" as const);

describe("成績の推移", () => {
  it("セッションごとの平均スコアと命中率を並べる", () => {
    const first = createStoredSession({ id: "a", date: "2026-07-01", rounds: [createRound({ finalResults: [...hits(2), "miss"] })] });
    const second = createStoredSession({ id: "b", date: "2026-07-08", rounds: [createRound({ roundNo: 1, finalResults: hits(2) }), createRound({ roundNo: 2, finalResults: ["miss", "miss"] })] });

    const trend = getSessionTrend([first, second]);

    expect(trend.map((item) => item.sessionId)).toEqual(["a", "b"]);
    expect(trend[0]).toMatchObject({ averageScore: 2, rounds: 1 });
    expect(trend[0].hitRate).toBeCloseTo(66.7, 1);
    expect(trend[1]).toMatchObject({ averageScore: 1, rounds: 2 });
    expect(trend[1].hitRate).toBe(50);
  });

  it("ラウンドが無いセッションは除く", () => {
    expect(getSessionTrend([createStoredSession({ rounds: [] })])).toEqual([]);
  });
});

describe("移動平均", () => {
  it("窓が埋まるまでは null にする", () => {
    expect(movingAverage([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
  });

  it("窓が1なら元の値を返す", () => {
    expect(movingAverage([5, 6], 1)).toEqual([5, 6]);
  });
});

describe("月別の実包と費用", () => {
  it("消費発数と購入金額を月ごとにまとめ、間の月も埋める", () => {
    const ledger = createLedger();
    ledger.entries = [
      ...ledger.entries,
      { id: "buy", date: "2026-09-10", type: "acquisition", categoryId: "trap-shell", quantity: 250, totalAmount: 12500, application: "銃砲店", createdAt: "2026-09-10T00:00:00.000Z" },
    ];
    const july = createStoredSession({ id: "july", date: "2026-07-20", rounds: [createRound({ finalResults: [...hits(3), "miss"] })] });
    const september = createStoredSession({ id: "september", date: "2026-09-05", rounds: [createRound({ finalResults: hits(2) })] });

    const monthly = getMonthlyAmmunition([july, september], ledger);

    expect(monthly.map((item) => item.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(monthly[0]).toMatchObject({ cartridges: 4, sessions: 1, purchaseAmount: 0 });
    expect(monthly[1]).toMatchObject({ cartridges: 0, sessions: 0, purchaseAmount: 0 });
    expect(monthly[2]).toMatchObject({ cartridges: 2, sessions: 1, purchaseAmount: 12500, purchaseQuantity: 250 });
  });

  it("金額が未入力の購入は費用に数えず、その月だけなら何も出さない", () => {
    const ledger = createLedger();
    ledger.entries = [{ id: "buy", date: "2026-07-05", type: "acquisition", categoryId: "trap-shell", quantity: 250, application: "金額未入力", createdAt: "2026-07-05T00:00:00.000Z" }];

    expect(getMonthlyAmmunition([], ledger)).toEqual([]);
    const withSession = getMonthlyAmmunition([createStoredSession({ date: "2026-07-20", rounds: [createRound({ finalResults: hits(2) })] })], ledger);
    expect(withSession).toEqual([{ month: "2026-07", cartridges: 2, sessions: 1, purchaseAmount: 0, purchaseQuantity: 0 }]);
  });

  it("記録が無ければ空", () => {
    expect(getMonthlyAmmunition([], { ...createLedger(), entries: [] })).toEqual([]);
  });
});
