import { describe, expect, it } from "vitest";
import { shouldUseManualShareSheet } from "./manualSharing";

function device(userAgent: string, platform: string, maxTouchPoints: number) {
  return { userAgent, platform, maxTouchPoints };
}

describe("shouldUseManualShareSheet", () => {
  it("uses the share sheet on iPhone", () => {
    expect(shouldUseManualShareSheet(device("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5))).toBe(true);
  });

  it("uses the share sheet on iPad reporting itself as MacIntel", () => {
    expect(shouldUseManualShareSheet(device("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 5))).toBe(true);
  });

  it("downloads directly on Mac", () => {
    expect(shouldUseManualShareSheet(device("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 0))).toBe(false);
  });

  it("downloads directly on Windows", () => {
    expect(shouldUseManualShareSheet(device("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0))).toBe(false);
  });
});
