import type { Code } from "../model/types";

export interface CriteriaEditorProps {
  codes: Code[];
  sheetSuggestions: string[];
  bindHint?: string;
  onUpsert: (index: number, label: string) => void;
  onRemove: (index: number) => void;
}

const MAX = 8;

export function renderCriteriaEditor(
  root: HTMLElement,
  props: CriteriaEditorProps,
): void {
  const rows = [...props.codes];
  const showEmpty = rows.length < MAX;
  const list = showEmpty
    ? [
        ...rows,
        { sheetName: "", parent: null, rowCount: 0, key: null as Code["key"] },
      ]
    : rows;

  root.innerHTML = `
    <section class="panel panel--wide" id="criteria-panel">
      <h2>Criteria</h2>
      <p class="hint">${escapeAttr(props.bindHint ?? "Type up to eight criteria, then drag a filled row onto a button or key to bind it.")} Workbook sheets appear as suggestions when a workbook is loaded.</p>
      <datalist id="sheet-suggestions">
        ${props.sheetSuggestions.map((s) => `<option value="${escapeAttr(s)}"></option>`).join("")}
      </datalist>
      <ul class="criteria-list">
        ${list
          .map((c, i) => {
            const isEmpty = !c.sheetName;
            const realIndex = isEmpty ? rows.length : i;
            return `<li class="criteria-row" draggable="${isEmpty ? "false" : "true"}" data-index="${realIndex}" data-sheet="${escapeAttr(c.sheetName)}">
              <span class="criteria-drag" aria-hidden="true">${isEmpty ? "·" : "⋮⋮"}</span>
              <input
                type="text"
                class="criteria-input"
                list="sheet-suggestions"
                data-index="${realIndex}"
                value="${escapeAttr(c.sheetName)}"
                placeholder="Type a criterion…"
                autocomplete="off"
              />
              <span class="criteria-key mono">${c.key ? `key ${c.key}` : ""}</span>
              ${
                isEmpty
                  ? ""
                  : `<button type="button" class="key-chip clear criteria-remove" data-index="${realIndex}" title="Remove">✕</button>`
              }
            </li>`;
          })
          .join("")}
      </ul>
    </section>
  `;

  root.querySelectorAll(".criteria-input").forEach((el) => {
    const input = el as HTMLInputElement;
    const commit = () => {
      const index = Number(input.dataset.index);
      props.onUpsert(index, input.value);
    };
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        e.preventDefault();
        input.blur();
      }
    });
  });

  root.querySelectorAll(".criteria-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      props.onRemove(Number((btn as HTMLElement).dataset.index));
    });
  });

  root.querySelectorAll(".criteria-row[draggable='true']").forEach((row) => {
    row.addEventListener("dragstart", (e) => {
      const sheet = (row as HTMLElement).dataset.sheet ?? "";
      if (!sheet) {
        e.preventDefault();
        return;
      }
      const dt = (e as DragEvent).dataTransfer;
      if (dt) {
        dt.setData("text/plain", sheet);
        dt.effectAllowed = "move";
      }
      row.classList.add("is-dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
