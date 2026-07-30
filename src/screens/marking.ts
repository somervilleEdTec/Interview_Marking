import type { Code, Session } from "../model/types";
import { CODE_SLOTS } from "../model/types";

export interface MarkingProps {
  codes: Code[];
  session: Session | null;
  armed: boolean;
  flashSlot: string | null;
  onToggleArm: () => void;
  onEnd: () => void;
}

function elapsed(iso: string | undefined): string {
  if (!iso) return "00:00:00";
  const ms = Date.now() - Date.parse(iso);
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function renderMarking(root: HTMLElement, props: MarkingProps): void {
  const counts = new Map<string, number>();
  for (const m of props.session?.marks ?? []) {
    if (m.dropped) continue;
    counts.set(m.slot, (counts.get(m.slot) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  root.className = `stage stage--marking ${props.armed ? "armed" : ""}`;
  root.innerHTML = `
    <section class="mark-main">
      <div class="status-row">
        <span class="status ${props.armed ? "status--live" : ""}">${props.armed ? "Armed" : "Paused"}</span>
        <span class="mono clock" id="clock">${elapsed(props.session?.startedAt)}</span>
        <span class="meta">${props.session?.participantNumber ?? "—"} · ${props.session?.interviewNumber ?? "—"} · ${total} marks</span>
      </div>
      <div class="tiles">
        ${CODE_SLOTS.map((slot) => {
          const code = props.codes.find((c) => c.key === slot);
          const flash = props.flashSlot === slot ? "flash" : "";
          const unbound = code ? "" : "tile--unbound";
          return `<div class="tile ${flash} ${unbound}" data-slot="${slot}">
            <span class="tile-key">${slot}</span>
            <span class="tile-name">${code?.sheetName ?? "unassigned"}</span>
            <span class="tile-count mono">${counts.get(slot) ?? 0}</span>
          </div>`;
        }).join("")}
      </div>
      <div class="tiles tiles--wide">
        <div class="tile tile--wide ${props.flashSlot === "general" ? "flash" : ""}" data-slot="general">
          <span class="tile-key">Space</span>
          <span class="tile-name">Mark this moment</span>
          <span class="tile-count mono">${counts.get("general") ?? 0}</span>
        </div>
        <div class="tile tile--wide tile--danger ${props.flashSlot === "nofit" ? "flash" : ""}" data-slot="nofit">
          <span class="tile-key">N</span>
          <span class="tile-name">Doesn't fit</span>
          <span class="tile-count mono">${counts.get("nofit") ?? 0}</span>
        </div>
      </div>
      <div class="mark-actions">
        <button type="button" class="btn" id="toggle-arm">${props.armed ? "Disarm" : "Arm"} shortcuts</button>
        <button type="button" class="btn btn--primary" id="end-session">End session → Review</button>
      </div>
      <p class="hint">Backspace undoes last mark. No sound. Keep eyes on the participant.</p>
    </section>
  `;

  const clock = root.querySelector("#clock");
  const timer = window.setInterval(() => {
    if (clock) clock.textContent = elapsed(props.session?.startedAt);
  }, 250);
  root.querySelector("#toggle-arm")?.addEventListener("click", () => {
    clearInterval(timer);
    props.onToggleArm();
  });
  root.querySelector("#end-session")?.addEventListener("click", () => {
    clearInterval(timer);
    props.onEnd();
  });
}
