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
  it("maps Start/Menu to Start/Stop and Select/View to undo", () => {
    const buttons = Array(16).fill(false);
    buttons[6] = true; // LT → K
    expect(gamepadAction(buttons, false)).toEqual({ type: "code", slot: "K" });
    buttons[6] = false;
    buttons[4] = true; // LB → J
    expect(gamepadAction(buttons, false)).toEqual({ type: "code", slot: "J" });
    buttons[4] = false;
    buttons[9] = true; // Menu / Options / Start → toggleArmed
    expect(gamepadAction(buttons, false)).toEqual({ type: "toggleArmed" });
    buttons[9] = false;
    buttons[8] = true; // View / Create / Select → undo
    expect(gamepadAction(buttons, false)).toEqual({ type: "undo" });
  });

  it("maps four face buttons to primary slots (W/N/S/E)", () => {
    const buttons = Array(16).fill(false);
    buttons[2] = true; // X / Square → A
    expect(gamepadAction(buttons, false)).toEqual({
      type: "code",
      slot: "A",
    });
    buttons[2] = false;
    buttons[1] = true; // B / Circle → F
    expect(gamepadAction(buttons, false, profileById("xbox"))).toEqual({
      type: "code",
      slot: "F",
    });
  });

  it("maps LB/LT/RB/RT as direct slots (no L1 hold)", () => {
    const buttons = Array(16).fill(false);
    buttons[4] = true;
    expect(gamepadAction(buttons, false, profileById("xbox"))).toEqual({
      type: "code",
      slot: "J",
    });
    buttons[4] = false;
    buttons[7] = true;
    expect(gamepadAction(buttons, false, profileById("xbox"))).toEqual({
      type: "code",
      slot: ";",
    });
    // Holding a face button alone still maps face, not secondary combo
    buttons[7] = false;
    buttons[2] = true;
    expect(gamepadAction(buttons, true, profileById("xbox"))).toEqual({
      type: "code",
      slot: "A",
    });
  });

  it("uses Xbox face labels X/Y/A/B; Start/Stop on Menu, undo on View", () => {
    const xbox = profileById("xbox");
    const east = xbox.buttons.find((b) => b.zone === "face-e");
    expect(east?.label).toBe("B");
    expect(east?.index).toBe(1);
    expect(xbox.buttons.find((b) => b.role.kind === "toggleArmed")?.index).toBe(
      9,
    );
    expect(xbox.buttons.find((b) => b.role.kind === "undo")?.index).toBe(8);
    expect(xbox.buttons.find((b) => b.zone === "shoulder-lb")?.label).toBe(
      "LB",
    );
  });

  it("uses DualSense Square/Triangle/Cross/Circle", () => {
    const ds = profileById("dualsense");
    expect(ds.buttons.find((b) => b.zone === "face-w")?.label).toBe("Square");
    expect(ds.buttons.find((b) => b.zone === "face-e")?.label).toBe("Circle");
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
    expect(pads[0].label).toBe("Xbox");
    expect(resolveAssignedPad(pads, null)?.id).toBe(fake.id);
    expect(resolveAssignedPad(pads, fake.id)?.id).toBe(fake.id);
    expect(resolveAssignedPad(pads, "missing")?.id).toBe(fake.id);
  });

  it("labels generic HID pads with the profile display name", () => {
    const fake = {
      index: 0,
      id: "Standard HID-compliant game controller",
      mapping: "standard",
      connected: true,
      buttons: [],
      axes: [],
      timestamp: 0,
    } as unknown as Gamepad;
    const pads = listConnectedPads([fake]);
    expect(pads[0].profileId).toBe("standard");
    expect(pads[0].label).toBe("Standard gamepad");
    expect(pads[0].label).not.toContain("HID-compliant");
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
    const out = readPadButtons(buttons, [6, 7]);
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
