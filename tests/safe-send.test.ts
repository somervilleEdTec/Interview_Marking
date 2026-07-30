import { describe, it, expect } from "vitest";
import { canSendToWindow } from "../electron/main/safe-send";

describe("canSendToWindow", () => {
  it("rejects null and destroyed windows", () => {
    expect(canSendToWindow(null)).toBe(false);
    expect(
      canSendToWindow({
        isDestroyed: () => true,
        webContents: { isDestroyed: () => false },
      }),
    ).toBe(false);
    expect(
      canSendToWindow({
        isDestroyed: () => false,
        webContents: { isDestroyed: () => true },
      }),
    ).toBe(false);
    expect(
      canSendToWindow({
        isDestroyed: () => false,
        webContents: null,
      }),
    ).toBe(false);
  });

  it("allows a live window with live webContents", () => {
    expect(
      canSendToWindow({
        isDestroyed: () => false,
        webContents: { isDestroyed: () => false },
      }),
    ).toBe(true);
  });
});
