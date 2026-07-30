import type { MarkSlot } from "../model/types";

export type ControllerProfileId = "dualsense" | "xbox" | "steam" | "standard";

export type ButtonRole =
  | {
      kind: "slot";
      slot: Exclude<MarkSlot, "general" | "nofit">;
      /** face = diamond; shoulder = LB/LT/RB/RT */
      group: "face" | "shoulder";
    }
  | { kind: "undo" }
  | { kind: "toggleArmed" };

export interface LayoutButton {
  role: ButtonRole;
  /** CSS grid area / class suffix for the visual */
  zone: string;
  label: string;
  /** Button index on the Gamepad API pad */
  index: number;
}

export interface ControllerProfile {
  id: ControllerProfileId;
  displayName: string;
  /** Match against Gamepad.id (case-insensitive substrings) */
  idMatchers: string[];
  buttons: LayoutButton[];
  /** Analog trigger indices (LT/RT) that need a high press threshold. */
  analogTriggerIndices: readonly number[];
}

/** Face + shoulders as direct presses (no L1-hold combinations). */
const STANDARD_BUTTONS: LayoutButton[] = [
  {
    role: { kind: "slot", slot: "A", group: "face" },
    zone: "face-w",
    label: "□ / X",
    index: 2,
  },
  {
    role: { kind: "slot", slot: "S", group: "face" },
    zone: "face-n",
    label: "△ / Y",
    index: 3,
  },
  {
    role: { kind: "slot", slot: "D", group: "face" },
    zone: "face-s",
    label: "✕ / A",
    index: 0,
  },
  {
    role: { kind: "slot", slot: "F", group: "face" },
    zone: "face-e",
    label: "○ / B",
    index: 1,
  },
  {
    role: { kind: "slot", slot: "J", group: "shoulder" },
    zone: "shoulder-lb",
    label: "L1 / LB",
    index: 4,
  },
  {
    role: { kind: "slot", slot: "K", group: "shoulder" },
    zone: "shoulder-lt",
    label: "L2 / LT",
    index: 6,
  },
  {
    role: { kind: "slot", slot: "L", group: "shoulder" },
    zone: "shoulder-rb",
    label: "R1 / RB",
    index: 5,
  },
  {
    role: { kind: "slot", slot: ";", group: "shoulder" },
    zone: "shoulder-rt",
    label: "R2 / RT",
    index: 7,
  },
  /**
   * Start / Menu / Options (Standard Gamepad button 9) — Mark Start/Stop.
   * Select / View / Create (button 8) — undo.
   */
  {
    role: { kind: "toggleArmed" },
    zone: "start",
    label: "Start",
    index: 9,
  },
  { role: { kind: "undo" }, zone: "undo", label: "Select", index: 8 },
];

function profile(
  id: ControllerProfileId,
  displayName: string,
  idMatchers: string[],
  faceLabels: [string, string, string, string],
  shoulderLabels: [string, string, string, string],
  startLabel: string,
  undoLabel: string,
): ControllerProfile {
  const buttons = STANDARD_BUTTONS.map((b) => {
    if (b.zone === "face-w") return { ...b, label: faceLabels[0] };
    if (b.zone === "face-n") return { ...b, label: faceLabels[1] };
    if (b.zone === "face-s") return { ...b, label: faceLabels[2] };
    if (b.zone === "face-e") return { ...b, label: faceLabels[3] };
    if (b.zone === "shoulder-lb") return { ...b, label: shoulderLabels[0] };
    if (b.zone === "shoulder-lt") return { ...b, label: shoulderLabels[1] };
    if (b.zone === "shoulder-rb") return { ...b, label: shoulderLabels[2] };
    if (b.zone === "shoulder-rt") return { ...b, label: shoulderLabels[3] };
    if (b.zone === "start") return { ...b, label: startLabel };
    if (b.zone === "undo") return { ...b, label: undoLabel };
    return { ...b };
  });
  return {
    id,
    displayName,
    idMatchers,
    buttons,
    analogTriggerIndices: [6, 7],
  };
}

export const CONTROLLER_PROFILES: ControllerProfile[] = [
  profile(
    "xbox",
    "Xbox",
    ["xbox", "x-box", "xinput", "microsoft"],
    ["X", "Y", "A", "B"],
    ["LB", "LT", "RB", "RT"],
    "Menu",
    "View",
  ),
  profile(
    "steam",
    "Steam / Steam Deck",
    ["steam", "valve", "deck"],
    ["X", "Y", "A", "B"],
    ["L1", "L2", "R1", "R2"],
    "Options",
    "View",
  ),
  profile(
    "dualsense",
    "PlayStation DualSense",
    ["dualsense", "dualshock", "sony", "054c"],
    ["Square", "Triangle", "Cross", "Circle"],
    ["L1", "L2", "R1", "R2"],
    "Options",
    "Create",
  ),
  profile(
    "standard",
    "Standard gamepad",
    [],
    ["X", "Y", "A", "B"],
    ["LB", "LT", "RB", "RT"],
    "Start",
    "Select",
  ),
];

export function matchProfile(
  gamepadId: string,
  mapping?: string,
): ControllerProfile {
  const lower = gamepadId.toLowerCase();
  for (const p of CONTROLLER_PROFILES) {
    if (p.id === "standard") continue;
    if (p.idMatchers.some((m) => lower.includes(m))) return p;
  }
  if (lower.includes("wireless controller") || lower.includes("playstation")) {
    return CONTROLLER_PROFILES.find((p) => p.id === "dualsense")!;
  }
  if (mapping === "standard") {
    return CONTROLLER_PROFILES.find((p) => p.id === "standard")!;
  }
  return CONTROLLER_PROFILES.find((p) => p.id === "standard")!;
}

export function profileById(id: ControllerProfileId): ControllerProfile {
  return (
    CONTROLLER_PROFILES.find((p) => p.id === id) ??
    CONTROLLER_PROFILES.find((p) => p.id === "standard")!
  );
}

/** Face button indices → slots A S D F (W/N/S/E). */
export const FACE_SLOT_INDICES = [2, 3, 0, 1] as const;
export const FACE_SLOTS = ["A", "S", "D", "F"] as const;
/** Shoulder indices LB/LT/RB/RT → slots J K L ; */
export const SHOULDER_SLOT_INDICES = [4, 6, 5, 7] as const;
export const SHOULDER_SLOTS = ["J", "K", "L", ";"] as const;
