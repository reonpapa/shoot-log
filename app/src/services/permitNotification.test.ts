import { describe, expect, it } from "vitest";
import { createPermitStatusKey, shouldShowPermitNotification } from "./permitNotification";

describe("permit notification", () => {
  it("does not notify on the first observation", () => {
    expect(shouldShowPermitNotification(null, createPermitStatusKey("gun-1", "three-months"), "three-months")).toBe(false);
  });

  it("notifies when the permit status level changes", () => {
    expect(shouldShowPermitNotification("gun-1:six-months", "gun-1:three-months", "three-months")).toBe(true);
  });

  it("does not notify for an unchanged or safe status", () => {
    expect(shouldShowPermitNotification("gun-1:three-months", "gun-1:three-months", "three-months")).toBe(false);
    expect(shouldShowPermitNotification("gun-1:six-months", "gun-1:safe", "safe")).toBe(false);
  });
});
