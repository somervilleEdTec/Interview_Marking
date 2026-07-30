import type { MarkSlot } from "../model/types";

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

/** DualSense-style: face buttons + L1 overlay for second four; L2/R2; Circle undo. */
export function gamepadAction(
  buttons: readonly boolean[],
  l1Held: boolean,
): MarkAction | null {
  // Standard mapping approx: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2
  if (buttons[1]) return { type: "undo" };
  if (buttons[6]) return { type: "general" };
  if (buttons[7]) return { type: "nofit" };
  const face = [
    buttons[2], // Square
    buttons[3], // Triangle
    buttons[0], // Cross
    buttons[5], // R1 as 4th when no L1 — also use face set
  ];
  // Prefer: Square, Triangle, Cross, Circle-alt via R1 when !L1 for first four
  const primary: Array<Exclude<MarkSlot, "general" | "nofit">> = [
    "A",
    "S",
    "D",
    "F",
  ];
  const secondary: Array<Exclude<MarkSlot, "general" | "nofit">> = [
    "J",
    "K",
    "L",
    ";",
  ];
  const slots = l1Held ? secondary : primary;
  const pressed = [buttons[2], buttons[3], buttons[0], buttons[5]];
  for (let i = 0; i < 4; i++) {
    if (pressed[i]) return { type: "code", slot: slots[i] };
  }
  void face;
  return null;
}
