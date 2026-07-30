import type { Code, Session } from "../model/types";
import { CODE_SLOTS } from "../model/types";
import { displayElapsedMs, formatInterviewTime } from "../model/time";
import type { ControllerProfile } from "../input/controller-profiles";
import type { InputMode } from "./controller-layout";
import { fixedRoleLabel, markPadHtml } from "./face-layout";
import { escapeHtml } from "./bind-targets";

export interface MarkingProps {
  codes: Code[];
  session: Session | null;
  armed: boolean;
  flashSlot: string | null;
  inputMode: InputMode;
  profile: ControllerProfile | null;
  onToggleMarking: () => void;
  onStartSession: () => void;
  onEnd: () => void;
}

function clockText(session: Session): string {
  return formatInterviewTime(displayElapsedMs(session));
}

function assignedCodes(
  codes: Code[],
): { key: Exclude<Code["key"], null>; sheetName: string }[] {
  const out: { key: Exclude<Code["key"], null>; sheetName: string }[] = [];
  for (const c of codes) {
    if (c.key && c.sheetName.trim()) {
      out.push({ key: c.key, sheetName: c.sheetName });
    }
  }
  return out;
}

function keyboardTilesHtml(
  codes: Code[],
  counts: Map<string, number>,
  flashSlot: string | null,
): string {
  const bound = CODE_SLOTS.map((slot) => {
    const code = codes.find((c) => c.key === slot);
    if (!code) return "";
    const flash = flashSlot === slot ? "flash" : "";
    return `<div class="tile ${flash}" data-slot="${slot}">
      <span class="tile-key">${slot}</span>
      <span class="tile-name">${escapeHtml(code.sheetName)}</span>
      <span class="tile-count mono">${counts.get(slot) ?? 0}</span>
    </div>`;
  }).filter(Boolean);
  if (!bound.length) {
    return `<p class="ink-3">No criteria bound to keys yet.</p>`;
  }
  return `<div class="tiles">${bound.join("")}</div>`;
}

function controllerTilesHtml(
  props: Pick<MarkingProps, "codes" | "flashSlot" | "profile">,
  counts: Map<string, number>,
): string {
  const profile = props.profile;
  if (!profile) {
    return `<p class="ink-3">No controller profile — switch to Keyboard or assign a pad on Setup.</p>`;
  }
  const byKey = new Map<string, string>();
  for (const c of assignedCodes(props.codes)) {
    byKey.set(c.key, c.sheetName);
  }
  const getLabel = (slot: string) => byKey.get(slot);
  const pad = markPadHtml(profile, getLabel, {
    hideUnassignedFace: true,
    counts,
    flashSlot: props.flashSlot,
  });
  if (!pad) {
    return `<p class="ink-3">No criteria bound to controller buttons yet.</p>`;
  }
  return pad;
}

/** Pure HTML for assigned code tiles (keyboard grid or controller face). */
export function markingCodesHtml(
  props: Pick<MarkingProps, "codes" | "flashSlot" | "inputMode" | "profile">,
  counts: Map<string, number> = new Map(),
): string {
  return props.inputMode === "controller"
    ? controllerTilesHtml(props, counts)
    : keyboardTilesHtml(props.codes, counts, props.flashSlot);
}

export function renderMarking(root: HTMLElement, props: MarkingProps): void {
  if (!props.session) {
    root.className = "stage stage--marking";
    root.innerHTML = `
      <section class="mark-main">
        <h2>Mark</h2>
        <p class="hint">Start a session to begin marking. Defaults: P1 / I1, window 45/15s.</p>
        <div class="mark-actions">
          <button type="button" class="btn btn--primary" id="start-session">Start session</button>
        </div>
      </section>
    `;
    stopMarkingClock();
    root.querySelector("#start-session")?.addEventListener("click", () => {
      props.onStartSession();
    });
    return;
  }

  const counts = new Map<string, number>();
  for (const m of props.session.marks) {
    if (m.dropped) continue;
    counts.set(m.slot, (counts.get(m.slot) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const onPad = props.inputMode === "controller";
  const generalKey = "Space";
  const nofitKey = "N";
  const undoKey = onPad
    ? props.profile
      ? fixedRoleLabel(props.profile, "undo")
      : "Select"
    : "Backspace";
  const startKey = onPad
    ? props.profile
      ? fixedRoleLabel(props.profile, "toggleArmed")
      : "Start"
    : null;

  const codesHtml = markingCodesHtml(props, counts);

  root.className = `stage stage--marking ${props.armed ? "armed" : ""} ${onPad ? "stage--marking-pad" : ""}`;
  root.innerHTML = `
    <section class="mark-main">
      <div class="status-row">
        <span class="status ${props.armed ? "status--live" : ""}">${props.armed ? "Marking" : "Stopped"}</span>
        <span class="mono clock" id="clock">${clockText(props.session)}</span>
        <span class="meta" id="mark-meta">${escapeHtml(props.session.participantNumber)} · ${escapeHtml(props.session.interviewNumber)} · ${total} marks</span>
      </div>
      ${codesHtml}
      <div class="tiles tiles--wide">
        <div class="tile tile--wide ${props.flashSlot === "general" ? "flash" : ""}" data-slot="general">
          <span class="tile-key">${escapeHtml(generalKey)}</span>
          <span class="tile-name">Mark this moment</span>
          <span class="tile-count mono">${counts.get("general") ?? 0}</span>
        </div>
        <div class="tile tile--wide tile--danger ${props.flashSlot === "nofit" ? "flash" : ""}" data-slot="nofit">
          <span class="tile-key">${escapeHtml(nofitKey)}</span>
          <span class="tile-name">Doesn't fit</span>
          <span class="tile-count mono">${counts.get("nofit") ?? 0}</span>
        </div>
      </div>
      <div class="mark-actions">
        <button type="button" class="btn ${props.armed ? "" : "btn--primary"}" id="toggle-marking">${props.armed ? "Stop" : "Start"}</button>
        <button type="button" class="btn btn--primary" id="end-session">End session → Review</button>
      </div>
      <p class="hint">Interview clock starts at 0:00; Stop freezes it.${startKey ? ` ${escapeHtml(startKey)} starts/stops marking.` : ""} ${escapeHtml(undoKey)} undoes last mark. No sound. Keep eyes on the participant.</p>
    </section>
  `;

  stopMarkingClock();
  const clock = root.querySelector("#clock");
  // Only tick while marking is started; Stop freezes the displayed elapsed.
  if (props.armed) {
    markingClockTimer = window.setInterval(() => {
      if (clock && props.session) {
        clock.textContent = clockText(props.session);
      }
    }, 250);
  }
  root.querySelector("#toggle-marking")?.addEventListener("click", () => {
    stopMarkingClock();
    props.onToggleMarking();
  });
  root.querySelector("#end-session")?.addEventListener("click", () => {
    stopMarkingClock();
    props.onEnd();
  });
}

/** Update counts + flash without rebuilding the Mark screen (avoids timer leaks). */
export function flashMarkingSlot(
  root: HTMLElement,
  slot: string | null,
  session: Session | null,
): void {
  root.querySelectorAll(".flash").forEach((el) => el.classList.remove("flash"));
  if (slot) {
    root.querySelector(`[data-slot="${slot}"]`)?.classList.add("flash");
  }
  const counts = new Map<string, number>();
  for (const m of session?.marks ?? []) {
    if (m.dropped) continue;
    counts.set(m.slot, (counts.get(m.slot) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  root.querySelectorAll("[data-slot]").forEach((el) => {
    const s = (el as HTMLElement).dataset.slot!;
    const countEl = el.querySelector(".tile-count");
    if (countEl) countEl.textContent = String(counts.get(s) ?? 0);
  });
  const meta = root.querySelector("#mark-meta");
  if (meta && session) {
    meta.textContent = `${session.participantNumber} · ${session.interviewNumber} · ${total} marks`;
  }
}

let markingClockTimer: number | null = null;

export function stopMarkingClock(): void {
  if (markingClockTimer != null) {
    window.clearInterval(markingClockTimer);
    markingClockTimer = null;
  }
}
