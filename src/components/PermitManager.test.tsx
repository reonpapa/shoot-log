import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyAmmunitionLedger } from "../domain/ammunition";
import { PermitManager } from "./PermitManager";

describe("所持許可・更新管理の戻り先", () => {
  it("アカウント設定から開いた場合の戻るボタンを正しく表示する", () => {
    const markup = renderToStaticMarkup(<PermitManager data={emptyAmmunitionLedger()} onChange={() => undefined} onBack={() => undefined} backLabel="アカウント設定へ戻る" />);

    expect(markup).toContain("アカウント設定へ戻る");
    expect(markup).not.toContain(">履歴へ戻る</button>");
  });
});
