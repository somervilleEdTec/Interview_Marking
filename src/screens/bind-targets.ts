/** Shared drag/drop + clear wiring for criterion → slot binding surfaces. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bindGroupHtml(title: string, tiles: string): string {
  return `<div class="bind-group">
    <h3 class="bind-group-head">${escapeHtml(title)}</h3>
    <div class="bind-grid">${tiles}</div>
  </div>`;
}

export function wireBindTargets(
  root: HTMLElement,
  byKey: Map<string, string>,
  onAssignKey: (sheetName: string, key: string | null) => void,
): void {
  root.querySelectorAll("[data-drop]").forEach((el) => {
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.classList.add("drag-over");
    });
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("drag-over");
      const sheet = (e as DragEvent).dataTransfer?.getData("text/plain");
      const slot = (el as HTMLElement).dataset.slot;
      if (sheet && slot) onAssignKey(sheet, slot);
    });
  });

  root.querySelectorAll(".bind-clear").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const sheet = (btn as HTMLElement).dataset.sheet;
      if (sheet) onAssignKey(sheet, null);
    });
  });

  root.querySelectorAll(".bind-select").forEach((el) => {
    el.addEventListener("change", () => {
      const select = el as HTMLSelectElement;
      const slot = select.dataset.slot ?? "";
      if (select.value) onAssignKey(select.value, slot);
      else {
        const current = byKey.get(slot);
        if (current) onAssignKey(current, null);
      }
    });
  });
}
