import type { MarkSlot } from "../model/types";
import {
  PRIMARY_SLOT_INDICES,
  PRIMARY_SLOTS,
  SECONDARY_SLOTS,
  type ControllerProfile,
} from "./controller-profiles";

export type MarkAction =
  | { type: "code"; slot: Exclude<MarkSlot, "general" | "nofit"> }
  | { type: "general" }
  | { type: "nofit" }
  | { type: "undo" };

/** Home-row keys → actions (Electron accelerator names). */
export const KEYBOARD_MAP: Record<string, MarkAction> = {
  A: { type: "code", slot: "A" },
  S: { type: "code", slot: "S" },
  D: { type: "code", slot: "D" },
  F: { type: "code", slot: "F" },
  J: { type: "code", slot: "J" },
  K: { type: "code", slot: "K" },
  L: { type: "code", slot: "L" },
  ";": { type: "code", slot: ";" },
  Space: { type: "general" },
  N: { type: "nofit" },
  Backspace: { type: "undo" },
};

/**
 * Map gamepad button edges → mark action.
 * Uses DualSense/standard indices by default; pass a profile for explicit roles.
 */
export function gamepadAction(
  buttons: readonly boolean[],
  l1Held: boolean,
  profile?: ControllerProfile,
): MarkAction | null {
  const undoIdx =
    profile?.buttons.find((b) => b.role.kind === "undo")?.index ?? 1;
  const generalIdx = profile?.triggerIndices.general ?? 6;
  const nofitIdx = profile?.triggerIndices.nofit ?? 7;

  if (buttons[undoIdx]) return { type: "undo" };
  if (buttons[generalIdx]) return { type: "general" };
  if (buttons[nofitIdx]) return { type: "nofit" };

  const activeSlots = l1Held ? SECONDARY_SLOTS : PRIMARY_SLOTS;
  const pressed = PRIMARY_SLOT_INDICES.map((i) => buttons[i]);
  for (let i = 0; i < 4; i++) {
    if (pressed[i]) return { type: "code", slot: activeSlots[i] };
  }
  return null;
}
