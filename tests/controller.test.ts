import { describe, it, expect } from "vitest";
import { gamepadAction } from "../src/input/action-map";
import { matchProfile, profileById } from "../src/input/controller-profiles";
import {
  listConnectedPads,
  resolveAssignedPad,
} from "../src/input/gamepad-detect";
import {
  buttonIsPressed,
  shouldSuppressGamepadMarks,
  TRIGGER_PRESS_THRESHOLD,
  readPadButtons,
} from "../src/input/gamepad-gate";

describe("matchProfile", () => {
  it("detects DualSense / Wireless Controller", () => {
    expect(
      matchProfile(
        "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
      ).id,
    ).toBe("dualsense");
    expect(matchProfile("Wireless Controller").id).toBe("dualsense");
  });

  it("detects Xbox", () => {
    expect(matchProfile("Xbox Wireless Controller").id).toBe("xbox");
    expect(matchProfile("Microsoft X-Box 360 pad").id).toBe("xbox");
  });

  it("detects Steam / Deck", () => {
    expect(matchProfile("Steam Deck Controller").id).toBe("steam");
    expect(matchProfile("Valve Software Steam Controller").id).toBe("steam");
  });

  it("falls back to standard", () => {
    expect(matchProfile("Generic USB Joystick", "standard").id).toBe(
      "standard",
    );
    expect(matchProfile("Unknown Device").id).toBe("standard");
  });
});

describe("gamepadAction profile-aware", () => {
  it("maps L2 to general and Circle to undo (default)", () => {
    const buttons = Array(16).fill(false);
    buttons[6] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "general" });
    buttons[6] = false;
    buttons[1] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "undo" });
  });

  it("maps face buttons to primary slots", () => {
    const buttons = Array(16).fill(false);
    buttons[2] = true;
    expect(gamepadAction(buttons, false)).toEqual({
      type: "code",
      slot: "A",
    });
  });

  it("maps face + L1 to secondary slots", () => {
    const buttons = Array(16).fill(false);
    buttons[2] = true;
    expect(gamepadAction(buttons, true, profileById("xbox"))).toEqual({
      type: "code",
      slot: "J",
    });
  });
});

describe("gamepad-detect", () => {
  it("lists connected pads and resolves assignment", () => {
    const fake = {
      index: 0,
      id: "Xbox Wireless Controller",
      mapping: "standard",
      connected: true,
      buttons: [],
      axes: [],
      timestamp: 0,
    } as unknown as Gamepad;
    const pads = listConnectedPads([fake, null]);
    expect(pads).toHaveLength(1);
    expect(pads[0].profileId).toBe("xbox");
    expect(resolveAssignedPad(pads, null)?.id).toBe(fake.id);
    expect(resolveAssignedPad(pads, fake.id)?.id).toBe(fake.id);
    expect(resolveAssignedPad(pads, "missing")?.id).toBe(fake.id);
  });
});

describe("gamepad-gate", () => {
  it("requires high analog trigger threshold", () => {
    expect(
      buttonIsPressed({ pressed: true, value: 0.4 }, { analogTrigger: true }),
    ).toBe(false);
    expect(
      buttonIsPressed(
        { pressed: true, value: TRIGGER_PRESS_THRESHOLD },
        { analogTrigger: true },
      ),
    ).toBe(true);
    expect(buttonIsPressed({ pressed: true, value: 0.1 })).toBe(true);
  });

  it("readPadButtons thresholds L2/R2 only", () => {
    const buttons = Array.from({ length: 8 }, () => ({
      pressed: false,
      value: 0,
    }));
    buttons[2] = { pressed: true, value: 1 };
    buttons[6] = { pressed: true, value: 0.5 };
    buttons[7] = { pressed: true, value: 0.95 };
    const out = readPadButtons(buttons, { general: 6, nofit: 7 });
    expect(out[2]).toBe(true);
    expect(out[6]).toBe(false);
    expect(out[7]).toBe(true);
  });

  it("suppresses marks when focus is editable", () => {
    expect(shouldSuppressGamepadMarks({ tagName: "INPUT", type: "text" })).toBe(
      true,
    );
    expect(
      shouldSuppressGamepadMarks({ tagName: "INPUT", type: "button" }),
    ).toBe(false);
    expect(shouldSuppressGamepadMarks({ tagName: "TEXTAREA" })).toBe(true);
    expect(shouldSuppressGamepadMarks({ tagName: "BUTTON" })).toBe(false);
    expect(shouldSuppressGamepadMarks(null)).toBe(false);
  });
});
