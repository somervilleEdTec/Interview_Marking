import type { Code } from "../model/types";
import type { ControllerProfile } from "../input/controller-profiles";
import { escapeHtml, wireBindTargets } from "./bind-targets";
import { padMapHtml } from "./pad-map";
import { keyMapHtml } from "./key-map";

export type InputMode = "controller" | "keyboard";

export interface ControllerLayoutProps {
  profile: ControllerProfile;
  codes: Code[];
  mode: InputMode;
  onMode: (mode: InputMode) => void;
  onAssignKey: (sheetName: string, key: string | null) => void;
}

export function renderControllerLayout(
  root: HTMLElement,
  props: ControllerLayoutProps,
): void {
  const byKey = new Map(
    props.codes.filter((c) => c.key).map((c) => [c.key!, c.sheetName]),
  );
  const onPad = props.mode === "controller";

  root.innerHTML = `
    <section class="panel panel--wide" id="controller-layout">
      <div class="row layout-head">
        <h2>Button map</h2>
        <div class="mode-toggle" role="group" aria-label="Input mode">
          ${modeButton("controller", "Controller", props.mode)}
          ${modeButton("keyboard", "Keyboard", props.mode)}
        </div>
      </div>
      <p class="hint">
        ${
          onPad
            ? `Drag a criterion onto a ${escapeHtml(props.profile.displayName)} button. Undo / General / No-fit are fixed.`
            : "No controller needed — drag a criterion onto a key, or pick one from the key's list."
        }
      </p>
      ${onPad ? padMapHtml(props.profile, byKey) : keyMapHtml(props.codes, byKey)}
    </section>
  `;

  root.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      props.onMode((btn as HTMLElement).dataset.mode as InputMode);
    });
  });

  wireBindTargets(root, byKey, props.onAssignKey);
}

function modeButton(
  mode: InputMode,
  label: string,
  current: InputMode,
): string {
  const on = mode === current;
  return `<button type="button" class="mode-btn ${on ? "on" : ""}" data-mode="${mode}" aria-pressed="${on}">${label}</button>`;
}
