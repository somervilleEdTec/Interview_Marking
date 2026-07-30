import type { DetectedPad } from "../input/gamepad-detect";

export interface ControllerPanelProps {
  pads: DetectedPad[];
  assignedId: string | null;
  onAssign: (id: string | null) => void;
  onOpenBluetooth: () => void;
}

export function renderControllerPanel(
  root: HTMLElement,
  props: ControllerPanelProps,
): void {
  const assigned = props.pads.find((p) => p.id === props.assignedId);
  const assignedMissing = !!props.assignedId && !assigned;
  const multiPad = props.pads.length > 1;
  const sole = props.pads.length === 1 ? props.pads[0] : null;

  root.innerHTML = `
    <section class="panel panel--wide" id="controller-panel">
      <h2>Controller</h2>
      <p class="hint">${
        multiPad
          ? "Pair your pad in system Bluetooth, press a button to wake it, then assign it for marking."
          : "Pair your pad in system Bluetooth and press a button to wake it. Marking uses the connected controller."
      }</p>
      <div class="row">
        <button type="button" class="btn" id="open-bt">Open Bluetooth settings</button>
        ${
          multiPad && props.assignedId
            ? `<button type="button" class="btn" id="clear-pad">Clear assignment</button>`
            : ""
        }
      </div>
      <p class="controller-status ${assignedMissing ? "is-warn" : ""}">
        ${
          sole
            ? `Connected: <strong>${escapeHtml(sole.profile.displayName)}</strong>`
            : assigned
              ? `Assigned: <strong>${escapeHtml(assigned.profile.displayName)}</strong>`
              : assignedMissing
                ? "Assigned pad disconnected — reconnect or choose another."
                : props.pads.length
                  ? "No pad assigned — marking uses the first connected pad until you assign one."
                  : "No controller detected."
        }
      </p>
      <ul class="pad-list">
        ${
          props.pads
            .map((p) => {
              const on = p.id === props.assignedId;
              const assignBtn = multiPad
                ? `<button type="button" class="btn btn--primary pad-assign" data-id="${escapeAttr(p.id)}" ${on ? "disabled" : ""}>
                  ${on ? "Assigned" : "Assign to marking"}
                </button>`
                : "";
              return `<li class="pad-item ${on || sole ? "on" : ""}">
                <div class="pad-meta">
                  <strong title="${escapeAttr(p.id)}">${escapeHtml(p.profile.displayName)}</strong>
                  <span class="ink-3">Pad ${p.index + 1}</span>
                </div>
                ${assignBtn}
              </li>`;
            })
            .join("") ||
          `<li class="ink-3">Connect a DualSense, Xbox, or Steam pad via Bluetooth, then press any button.</li>`
        }
      </ul>
    </section>
  `;

  root.querySelector("#open-bt")?.addEventListener("click", () => {
    props.onOpenBluetooth();
  });
  root.querySelector("#clear-pad")?.addEventListener("click", () => {
    props.onAssign(null);
  });
  root.querySelectorAll(".pad-assign").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.id ?? null;
      props.onAssign(id);
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
