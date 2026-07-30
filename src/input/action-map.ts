import type { MarkSlot } from "../model/types";
import {
  FACE_SLOT_INDICES,
  FACE_SLOTS,
  SHOULDER_SLOT_INDICES,
  SHOULDER_SLOTS,
  type ControllerProfile,
} from "./controller-profiles";

export type MarkAction =
  | { type: "code"; slot: Exclude<MarkSlot, "general" | "nofit"> }
  | { type: "general" }
  | { type: "nofit" }
  | { type: "undo" }
  | { type: "toggleArmed" };

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
 * Face + LB/LT/RB/RT are direct slot presses (no hold combinations).
 * Start/Menu/Options toggles Mark Start/Stop; Select/View/Create undoes.
 */
export function gamepadAction(
  buttons: readonly boolean[],
  _l1Held: boolean,
  profile?: ControllerProfile,
): MarkAction | null {
  const startIdx =
    profile?.buttons.find((b) => b.role.kind === "toggleArmed")?.index ?? 9;
  const undoIdx =
    profile?.buttons.find((b) => b.role.kind === "undo")?.index ?? 8;

  if (buttons[startIdx]) return { type: "toggleArmed" };
  if (buttons[undoIdx]) return { type: "undo" };

  for (let i = 0; i < FACE_SLOT_INDICES.length; i++) {
    if (buttons[FACE_SLOT_INDICES[i]]) {
      return { type: "code", slot: FACE_SLOTS[i] };
    }
  }
  for (let i = 0; i < SHOULDER_SLOT_INDICES.length; i++) {
    if (buttons[SHOULDER_SLOT_INDICES[i]]) {
      return { type: "code", slot: SHOULDER_SLOTS[i] };
    }
  }
  return null;
}
