import type { Code } from "../model/types";
import { CODE_SLOTS } from "../model/types";
import { bindGroupHtml, escapeHtml } from "./bind-targets";

const LEFT = CODE_SLOTS.slice(0, 4);
const RIGHT = CODE_SLOTS.slice(4);

export function keyMapHtml(codes: Code[], byKey: Map<string, string>): string {
  const named = codes.filter((c) => c.sheetName.trim());

  const tile = (slot: string) => {
    const bound = byKey.get(slot) ?? "";
    const options = named
      .map(
        (c) =>
          `<option value="${escapeHtml(c.sheetName)}" ${c.sheetName === bound ? "selected" : ""}>${escapeHtml(c.sheetName)}</option>`,
      )
      .join("");
    return `<div class="bind-tile bind-tile--key ${bound ? "is-bound" : ""}" data-drop="1" data-slot="${escapeHtml(slot)}">
      <kbd class="bind-cap mono">${escapeHtml(slot)}</kbd>
      <select class="bind-select" data-slot="${escapeHtml(slot)}" aria-label="Criterion on key ${escapeHtml(slot)}" ${named.length ? "" : "disabled"}>
        <option value="">${named.length ? "Unassigned" : "Type criteria first"}</option>
        ${options}
      </select>
    </div>`;
  };

  return `<div class="bind-groups">
    ${bindGroupHtml("Left hand", LEFT.map(tile).join(""))}
    ${bindGroupHtml("Right hand", RIGHT.map(tile).join(""))}
    <p class="bind-fixed mono">
      <span>Backspace · Undo</span>
      <span>Space · General</span>
      <span>N · No-fit</span>
    </p>
  </div>`;
}
