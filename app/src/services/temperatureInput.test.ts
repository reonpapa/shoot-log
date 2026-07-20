import { describe, expect, it } from "vitest";
import { validateTemperatureInput } from "./temperatureInput";

describe("気温入力", () => {
  it("半角数字、小数点、先頭のマイナスだけを受け付ける", () => {
    expect(validateTemperatureInput("18")).toBe("18");
    expect(validateTemperatureInput("-3.5")).toBe("-3.5");
    expect(validateTemperatureInput("")).toBe("");
  });

  it("全角数字や文字を受け付けない", () => {
    expect(validateTemperatureInput("１８")).toBeNull();
    expect(validateTemperatureInput("18℃")).toBeNull();
    expect(validateTemperatureInput("1.2.3")).toBeNull();
  });
});
