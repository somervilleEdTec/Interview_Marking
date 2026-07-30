import type { MarkSlot } from "../model/types";

export type ControllerProfileId = "dualsense" | "xbox" | "steam" | "standard";

export type ButtonRole =
  | {
      kind: "slot";
      slot: Exclude<MarkSlot, "general" | "nofit">;
      layer: "primary" | "secondary";
    }
  | { kind: "modifier" }
  | { kind: "general" }
  | { kind: "nofit" }
  | { kind: "undo" };

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
  modifierIndex: number;
  triggerIndices: { general: number; nofit: number };
}

/** Shared standard mapping used by DualSense/Xbox/Steam when Chromium reports mapping=standard. */
const STANDARD_BUTTONS: LayoutButton[] = [
  {
    role: { kind: "slot", slot: "A", layer: "primary" },
    zone: "face-w",
    label: "□ / X",
    index: 2,
  },
  {
    role: { kind: "slot", slot: "S", layer: "primary" },
    zone: "face-n",
    label: "△ / Y",
    index: 3,
  },
  {
    role: { kind: "slot", slot: "D", layer: "primary" },
    zone: "face-s",
    label: "✕ / A",
    index: 0,
  },
  {
    role: { kind: "slot", slot: "F", layer: "primary" },
    zone: "face-e",
    label: "○ / B",
    index: 1,
  },
  {
    role: { kind: "slot", slot: "J", layer: "secondary" },
    zone: "sec-w",
    label: "L1+□",
    index: 2,
  },
  {
    role: { kind: "slot", slot: "K", layer: "secondary" },
    zone: "sec-n",
    label: "L1+△",
    index: 3,
  },
  {
    role: { kind: "slot", slot: "L", layer: "secondary" },
    zone: "sec-s",
    label: "L1+✕",
    index: 0,
  },
  {
    role: { kind: "slot", slot: ";", layer: "secondary" },
    zone: "sec-e",
    label: "L1+○",
    index: 1,
  },
  { role: { kind: "modifier" }, zone: "l1", label: "L1 / LB", index: 4 },
  { role: { kind: "undo" }, zone: "undo", label: "R1 / RB", index: 5 },
  { role: { kind: "general" }, zone: "l2", label: "L2 / LT", index: 6 },
  { role: { kind: "nofit" }, zone: "r2", label: "R2 / RT", index: 7 },
];

function profile(
  id: ControllerProfileId,
  displayName: string,
  idMatchers: string[],
  faceLabels: [string, string, string, string],
): ControllerProfile {
  const buttons = STANDARD_BUTTONS.map((b) => {
    if (b.zone === "face-w") return { ...b, label: faceLabels[0] };
    if (b.zone === "face-n") return { ...b, label: faceLabels[1] };
    if (b.zone === "face-s") return { ...b, label: faceLabels[2] };
    if (b.zone === "face-e") return { ...b, label: faceLabels[3] };
    if (b.zone === "undo") {
      const undo =
        id === "xbox" ? "RB" : id === "dualsense" ? "R1" : b.label;
      return { ...b, label: undo };
    }
    if (b.zone === "l1") {
      return {
        ...b,
        label: id === "xbox" ? "LB" : id === "dualsense" ? "L1" : b.label,
      };
    }
    if (b.zone === "l2") {
      return {
        ...b,
        label: id === "xbox" ? "LT" : id === "dualsense" ? "L2" : b.label,
      };
    }
    if (b.zone === "r2") {
      return {
        ...b,
        label: id === "xbox" ? "RT" : id === "dualsense" ? "R2" : b.label,
      };
    }
    return { ...b };
  });
  return {
    id,
    displayName,
    idMatchers,
    buttons,
    modifierIndex: 4,
    triggerIndices: { general: 6, nofit: 7 },
  };
}

export const CONTROLLER_PROFILES: ControllerProfile[] = [
  profile(
    "xbox",
    "Xbox",
    ["xbox", "x-box", "xinput", "microsoft"],
    ["X", "Y", "A", "B"],
  ),
  profile(
    "steam",
    "Steam / Steam Deck",
    ["steam", "valve", "deck"],
    ["X", "Y", "A", "B"],
  ),
  profile(
    "dualsense",
    "PlayStation DualSense",
    ["dualsense", "dualshock", "sony", "054c"],
    ["Square", "Triangle", "Cross", "Circle"],
  ),
  profile("standard", "Standard gamepad", [], ["X", "Y", "A", "B"]),
];

export function matchProfile(
  gamepadId: string,
  mapping?: string,
): ControllerProfile {
  const lower = gamepadId.toLowerCase();
  // Prefer vendor-specific profiles before generic "Wireless Controller" DualSense names
  for (const p of CONTROLLER_PROFILES) {
    if (p.id === "standard") continue;
    if (p.idMatchers.some((m) => lower.includes(m))) return p;
  }
  // Chromium often reports DualSense as bare "Wireless Controller"
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

/** Primary face indices used when !modifier; secondary uses same indices with modifier held.
 * Order matches PRIMARY_SLOTS: West(X/□), North(Y/△), South(A/✕), East(B/○).
 */
export const PRIMARY_SLOT_INDICES = [2, 3, 0, 1] as const;
export const PRIMARY_SLOTS = ["A", "S", "D", "F"] as const;
export const SECONDARY_SLOTS = ["J", "K", "L", ";"] as const;
