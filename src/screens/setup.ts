import type { Code } from "../model/types";
import { CODE_SLOTS } from "../model/types";

export interface SetupProps {
  codes: Code[];
  workbookPath: string;
  onPickWorkbook: () => void;
  onAssignKey: (sheetName: string, key: string | null) => void;
  onStart: (
    participantNumber: string,
    interviewNumber: string,
    before: number,
    after: number,
  ) => void;
}

export function renderSetup(root: HTMLElement, props: SetupProps): void {
  const assigned = new Set(props.codes.filter((c) => c.key).map((c) => c.key));
  root.className = "stage stage--setup";
  root.innerHTML = `
    <section class="panel panel--wide">
      <h1>Setup</h1>
      <p class="lede">Open your coding workbook, assign up to eight codes to home-row keys, then start with the Zoom recording.</p>
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
      <button type="button" class="btn btn--primary" id="start" ${props.codes.length ? "" : "disabled"}>
        Start session (arm marking)
      </button>
    </section>
    <section class="panel">
      <h2>Codes</h2>
      <p class="hint">Click a key to bind. Max eight. Sorted by existing row count.</p>
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
          '<li class="ink-3">Load a workbook to see worksheets.</li>'
        }
      </ul>
    </section>
  `;
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
