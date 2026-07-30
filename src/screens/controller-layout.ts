import type { Code } from "../model/types";
import { CODE_SLOTS } from "../model/types";
import type { ControllerProfile } from "../input/controller-profiles";

export interface ControllerLayoutProps {
  profile: ControllerProfile;
  codes: Code[];
  layer: "primary" | "secondary";
  onLayer: (layer: "primary" | "secondary") => void;
  onAssignKey: (sheetName: string, key: string | null) => void;
}

export function renderControllerLayout(
  root: HTMLElement,
  props: ControllerLayoutProps,
): void {
  const byKey = new Map(
    props.codes.filter((c) => c.key).map((c) => [c.key!, c.sheetName]),
  );

  const dropZones = CODE_SLOTS.filter((slot) => {
    const primary = ["A", "S", "D", "F"].includes(slot);
    return props.layer === "primary" ? primary : !primary;
  });

  const zoneForSlot: Record<string, string> = {
    A: "face-w",
    S: "face-n",
    D: "face-s",
    F: "face-e",
    J: "face-w",
    K: "face-n",
    L: "face-s",
    ";": "face-e",
  };

  root.innerHTML = `
    <section class="panel panel--wide" id="controller-layout">
      <div class="row layout-head">
        <h2>Button map · ${escapeHtml(props.profile.displayName)}</h2>
        <div class="layer-toggle">
          <button type="button" class="btn ${props.layer === "primary" ? "btn--primary" : ""}" data-layer="primary">Primary</button>
          <button type="button" class="btn ${props.layer === "secondary" ? "btn--primary" : ""}" data-layer="secondary">L1 / LB layer</button>
        </div>
      </div>
      <p class="hint">Drag a criterion onto a face button. Undo / General / No-fit are fixed.</p>
      <div class="pad-visual" data-profile="${props.profile.id}">
        <div class="pad-shoulders">
          <div class="pad-fixed pad-l2" title="General">L2 · General</div>
          <div class="pad-fixed pad-l1" title="Modifier">L1 · Layer</div>
          <div class="pad-fixed pad-r1" title="slot F/;">R1</div>
          <div class="pad-fixed pad-r2" title="No-fit">R2 · No-fit</div>
        </div>
        <div class="pad-body">
          <div class="pad-fixed pad-undo">○ Undo</div>
          <div class="pad-faces">
            ${dropZones
              .map((slot) => {
                const label = byKey.get(slot) ?? "";
                const zone = zoneForSlot[slot];
                return `<div class="pad-drop ${zone}" data-slot="${slot}" data-drop="1">
                  <span class="pad-drop-slot mono">${slot}</span>
                  <span class="pad-drop-label">${label ? escapeHtml(label) : "Drop criterion"}</span>
                  ${
                    label
                      ? `<button type="button" class="pad-drop-clear" data-sheet="${escapeAttr(label)}" title="Clear">✕</button>`
                      : ""
                  }
                </div>`;
              })
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;

  root.querySelectorAll("[data-layer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      props.onLayer(
        (btn as HTMLElement).dataset.layer as "primary" | "secondary",
      );
    });
  });

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
      if (!sheet || !slot) return;
      props.onAssignKey(sheet, slot);
    });
  });

  root.querySelectorAll(".pad-drop-clear").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const sheet = (btn as HTMLElement).dataset.sheet;
      if (sheet) props.onAssignKey(sheet, null);
    });
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
