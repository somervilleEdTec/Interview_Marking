import type { Code } from "../model/types";
import type { DetectedPad } from "../input/gamepad-detect";
import type { ControllerProfile } from "../input/controller-profiles";
import { profileById } from "../input/controller-profiles";
import { renderCriteriaEditor } from "./criteria-editor";
import { renderControllerPanel } from "./controller-panel";
import { renderControllerLayout } from "./controller-layout";
import type { InputMode } from "./controller-layout";

export interface SetupProps {
  codes: Code[];
  sheetSuggestions: string[];
  pads: DetectedPad[];
  assignedGamepadId: string | null;
  inputMode: InputMode;
  onAssignKey: (sheetName: string, key: string | null) => void;
  onUpsertCriterion: (
    index: number,
    label: string,
    opts?: { focusNext?: boolean },
  ) => void;
  onRemoveCriterion: (index: number) => void;
  onAssignGamepad: (id: string | null) => void;
  onOpenBluetooth: () => void;
  onInputMode: (mode: InputMode) => void;
}

export function renderSetup(root: HTMLElement, props: SetupProps): void {
  const profile: ControllerProfile =
    props.pads.find((p) => p.id === props.assignedGamepadId)?.profile ??
    props.pads[0]?.profile ??
    profileById("standard");

  root.className = "stage stage--setup";
  root.innerHTML = `
    <div class="setup-bind-row">
      <div class="setup-bind-col">
        <div id="criteria-host"></div>
        ${props.inputMode === "controller" ? '<div id="controller-host"></div>' : ""}
      </div>
      <div id="layout-host"></div>
    </div>
  `;

  const criteriaHost = root.querySelector("#criteria-host") as HTMLElement;
  renderCriteriaEditor(criteriaHost, {
    codes: props.codes,
    sheetSuggestions: props.sheetSuggestions,
    bindHint:
      props.inputMode === "keyboard"
        ? "Type up to eight criteria, then drag a filled row onto a home-row key — or pick it from that key's list."
        : props.pads.length
          ? "Type up to eight criteria, then drag onto face buttons or LB / LT / RB / RT."
          : "Type up to eight criteria. No controller? Use Keyboard to bind home-row keys.",
    showKeyboardOption: props.inputMode === "controller",
    onUseKeyboard: () => props.onInputMode("keyboard"),
    onUpsert: props.onUpsertCriterion,
    onRemove: props.onRemoveCriterion,
  });

  const layoutHost = root.querySelector("#layout-host") as HTMLElement;
  renderControllerLayout(layoutHost, {
    profile,
    codes: props.codes,
    mode: props.inputMode,
    onMode: props.onInputMode,
    onAssignKey: props.onAssignKey,
  });

  const controllerHost = root.querySelector(
    "#controller-host",
  ) as HTMLElement | null;
  if (controllerHost) {
    renderControllerPanel(controllerHost, {
      pads: props.pads,
      assignedId: props.assignedGamepadId,
      onAssign: props.onAssignGamepad,
      onOpenBluetooth: props.onOpenBluetooth,
    });
  }
}
