import type { Code } from "../model/types";
import type { DetectedPad } from "../input/gamepad-detect";
import type { ControllerProfile } from "../input/controller-profiles";
import { profileById } from "../input/controller-profiles";
import { renderCriteriaEditor } from "./criteria-editor";
import { renderControllerPanel } from "./controller-panel";
import { renderControllerLayout } from "./controller-layout";
import type { InputMode } from "./controller-layout";
import { escapeHtml } from "./bind-targets";

export interface SetupProps {
  codes: Code[];
  workbookPath: string;
  sheetSuggestions: string[];
  pads: DetectedPad[];
  assignedGamepadId: string | null;
  inputMode: InputMode;
  onPickWorkbook: () => void;
  onAssignKey: (sheetName: string, key: string | null) => void;
  onUpsertCriterion: (index: number, label: string) => void;
  onRemoveCriterion: (index: number) => void;
  onAssignGamepad: (id: string | null) => void;
  onOpenBluetooth: () => void;
  onInputMode: (mode: InputMode) => void;
  onStart: (
    participantNumber: string,
    interviewNumber: string,
    before: number,
    after: number,
  ) => void;
}

export function renderSetup(root: HTMLElement, props: SetupProps): void {
  const boundCount = props.codes.filter(
    (c) => c.key && c.sheetName.trim(),
  ).length;
  const profile: ControllerProfile =
    props.pads.find((p) => p.id === props.assignedGamepadId)?.profile ??
    props.pads[0]?.profile ??
    profileById("standard");

  root.className = "stage stage--setup";
  root.innerHTML = `
    <section class="panel panel--wide">
      <h1>Setup</h1>
      <p class="lede">Open your interview workbook, type criteria, assign them to controller buttons (or home-row keys), then start with the Zoom recording.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" id="pick-wb">Choose workbook</button>
        <span class="mono path">${escapeHtml(props.workbookPath || "No workbook selected")}</span>
      </div>
      <div class="fields">
        <label class="field">Participant <input id="pnum" value="P1" /></label>
        <label class="field">Interview <input id="inum" value="I1" /></label>
        <label class="field">Window before (s) <input id="before" type="number" value="45" /></label>
        <label class="field">Window after (s) <input id="after" type="number" value="15" /></label>
      </div>
      <button type="button" class="btn btn--primary" id="start" ${boundCount ? "" : "disabled"}>
        Start session (arm marking)
      </button>
    </section>
    <div class="setup-bind-row">
      <div id="criteria-host"></div>
      <div class="setup-bind-col">
        <div id="layout-host"></div>
        ${props.inputMode === "controller" ? '<div id="controller-host"></div>' : ""}
      </div>
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
          ? "Type up to eight criteria, then drag a filled row onto a controller button."
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

  root
    .querySelector("#pick-wb")
    ?.addEventListener("click", () => props.onPickWorkbook());
  root.querySelector("#start")?.addEventListener("click", () => {
    const p = (root.querySelector("#pnum") as HTMLInputElement).value.trim();
    const i = (root.querySelector("#inum") as HTMLInputElement).value.trim();
    const before = Number(
      (root.querySelector("#before") as HTMLInputElement).value,
    );
    const after = Number(
      (root.querySelector("#after") as HTMLInputElement).value,
    );
    props.onStart(p, i, before, after);
  });
}
