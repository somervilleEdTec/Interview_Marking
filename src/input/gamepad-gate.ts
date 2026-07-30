/** Analog triggers (L2/R2) must exceed this to count as pressed. */
export const TRIGGER_PRESS_THRESHOLD = 0.9;

type FocusLike = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
};

export function isEditableTarget(el: FocusLike | null): boolean {
  if (!el?.tagName) return false;
  const tag = el.tagName.toUpperCase();
  if (tag === "INPUT") {
    const t = (el.type ?? "text").toLowerCase();
    if (t === "button" || t === "submit" || t === "checkbox" || t === "radio") {
      return false;
    }
    return true;
  }
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

/** True when gamepad mark edges should be ignored (user typing elsewhere). */
export function shouldSuppressGamepadMarks(
  activeElement: FocusLike | null,
): boolean {
  return isEditableTarget(activeElement);
}

/** Digital buttons use pressed; analog triggers need a high value threshold. */
export function buttonIsPressed(
  button: { pressed: boolean; value: number } | undefined,
  opts: { analogTrigger?: boolean } = {},
): boolean {
  if (!button) return false;
  if (opts.analogTrigger) return button.value >= TRIGGER_PRESS_THRESHOLD;
  return button.pressed;
}

/** Build boolean pressed array with obscure L2/R2 threshold. */
export function readPadButtons(
  buttons: ArrayLike<{ pressed: boolean; value: number }>,
  triggerIndices: { general: number; nofit: number },
): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < buttons.length; i++) {
    const analog = i === triggerIndices.general || i === triggerIndices.nofit;
    out.push(buttonIsPressed(buttons[i], { analogTrigger: analog }));
  }
  return out;
}
