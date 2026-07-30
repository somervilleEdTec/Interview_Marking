import type { Code } from "../model/types";
import { CODE_SLOTS } from "../model/types";
import type { DetectedPad } from "../input/gamepad-detect";
import type { ControllerProfile } from "../input/controller-profiles";
import { profileById } from "../input/controller-profiles";
import { renderCriteriaEditor } from "./criteria-editor";
import { renderControllerPanel } from "./controller-panel";
import { renderControllerLayout } from "./controller-layout";

export interface SetupProps {
  codes: Code[];
  workbookPath: string;
  sheetSuggestions: string[];
  pads: DetectedPad[];
  assignedGamepadId: string | null;
  layoutLayer: "primary" | "secondary";
  onPickWorkbook: () => void;
  onAssignKey: (sheetName: string, key: string | null) => void;
  onUpsertCriterion: (index: number, label: string) => void;
  onRemoveCriterion: (index: number) => void;
  onAssignGamepad: (id: string | null) => void;
  onOpenBluetooth: () => void;
  onLayoutLayer: (layer: "primary" | "secondary") => void;
  onStart: (
    participantNumber: string,
    interviewNumber: string,
    before: number,
    after: number,
  ) => void;
}

export function renderSetup(root: HTMLElement, props: SetupProps): void {
  const assigned = new Set(props.codes.filter((c) => c.key).map((c) => c.key));
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
      <p class="lede">Open your coding workbook, type criteria, assign them to controller buttons (or home-row keys), then start with the Zoom recording.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" id="pick-wb">Choose workbook</button>
        <span class="mono path">${props.workbookPath || "No workbook selected"}</span>
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
    <div id="criteria-host"></div>
    <div id="controller-host"></div>
    <div id="layout-host"></div>
    <section class="panel">
      <h2>Keyboard mirror</h2>
      <p class="hint">Same bindings as the controller map. Click a key to bind the criterion named in the row.</p>
      <ul class="code-list">
        ${
          props.codes
            .map((c) => {
              const keys = CODE_SLOTS.map(
                (k) =>
                  `<button type="button" class="key-chip ${c.key === k ? "on" : ""} ${assigned.has(k) && c.key !== k ? "taken" : ""}" data-sheet="${c.sheetName}" data-key="${k}" ${assigned.has(k) && c.key !== k ? "disabled" : ""}>${k}</button>`,
              ).join("");
              return `<li>
              <div class="code-meta">
                <strong>${c.sheetName}</strong>
                <span class="ink-3">${c.parent ? "↳ " + c.parent : "top"} · ${c.rowCount} rows</span>
              </div>
              <div class="key-row">${keys}
                <button type="button" class="key-chip clear" data-sheet="${c.sheetName}" data-key="">✕</button>
              </div>
            </li>`;
            })
            .join("") ||
          '<li class="ink-3">Type criteria above to bind keys.</li>'
        }
      </ul>
    </section>
  `;

  const criteriaHost = root.querySelector("#criteria-host") as HTMLElement;
  renderCriteriaEditor(criteriaHost, {
    codes: props.codes,
    sheetSuggestions: props.sheetSuggestions,
    onUpsert: props.onUpsertCriterion,
    onRemove: props.onRemoveCriterion,
  });

  const controllerHost = root.querySelector("#controller-host") as HTMLElement;
  renderControllerPanel(controllerHost, {
    pads: props.pads,
    assignedId: props.assignedGamepadId,
    onAssign: props.onAssignGamepad,
    onOpenBluetooth: props.onOpenBluetooth,
  });

  const layoutHost = root.querySelector("#layout-host") as HTMLElement;
  renderControllerLayout(layoutHost, {
    profile,
    codes: props.codes,
    layer: props.layoutLayer,
    onLayer: props.onLayoutLayer,
    onAssignKey: props.onAssignKey,
  });

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
  root.querySelectorAll(".key-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sheet = (btn as HTMLElement).dataset.sheet!;
      const key = (btn as HTMLElement).dataset.key || null;
      const bound = props.codes.filter((c) => c.key).length;
      if (
        key &&
        !props.codes.find((c) => c.sheetName === sheet)?.key &&
        bound >= 8
      ) {
        alert("Maximum eight codes assigned");
        return;
      }
      props.onAssignKey(sheet, key);
    });
  });
}
