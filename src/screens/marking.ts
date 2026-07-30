import type { Code, Session } from "../model/types";
import { CODE_SLOTS } from "../model/types";
import { elapsedSinceStart, formatInterviewTime } from "../model/time";
import type { ControllerProfile } from "../input/controller-profiles";
import type { InputMode } from "./controller-layout";
import {
  faceDiamondHtml,
  facePrimaryButtons,
  faceSecondaryButtons,
  fixedRoleLabel,
  slotButtonsToFaceCells,
} from "./face-layout";
import { escapeHtml } from "./bind-targets";

export interface MarkingProps {
  codes: Code[];
  session: Session | null;
  armed: boolean;
  flashSlot: string | null;
  inputMode: InputMode;
  profile: ControllerProfile | null;
  onToggleArm: () => void;
  onEnd: () => void;
}

function clockText(startedAt: string | undefined): string {
  return formatInterviewTime(elapsedSinceStart(startedAt));
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
  const opts = {
    hideUnassigned: true,
    counts,
    flashSlot: props.flashSlot,
  };
  const primary = slotButtonsToFaceCells(
    facePrimaryButtons(profile),
    profile,
    getLabel,
    opts,
  );
  const secondary = slotButtonsToFaceCells(
    faceSecondaryButtons(profile),
    profile,
    getLabel,
    opts,
  );
  const hasPrimary = Object.keys(primary).length > 0;
  const hasSecondary = Object.keys(secondary).length > 0;
  if (!hasPrimary && !hasSecondary) {
    return `<p class="ink-3">No criteria bound to controller buttons yet.</p>`;
  }
  const mod = fixedRoleLabel(profile, "modifier");
  return `<div class="face-mark">
    ${hasPrimary ? `<div class="face-mark__group"><h3 class="face-mark__head">Press</h3>${faceDiamondHtml(primary, "mark")}</div>` : ""}
    ${hasSecondary ? `<div class="face-mark__group"><h3 class="face-mark__head">Hold ${escapeHtml(mod)}</h3>${faceDiamondHtml(secondary, "mark")}</div>` : ""}
  </div>`;
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
  const counts = new Map<string, number>();
  for (const m of props.session?.marks ?? []) {
    if (m.dropped) continue;
    counts.set(m.slot, (counts.get(m.slot) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const onPad = props.inputMode === "controller";
  const generalKey = onPad
    ? (props.profile ? fixedRoleLabel(props.profile, "general") : "LT")
    : "Space";
  const nofitKey = onPad
    ? (props.profile ? fixedRoleLabel(props.profile, "nofit") : "RT")
    : "N";
  const undoKey = onPad
    ? (props.profile ? fixedRoleLabel(props.profile, "undo") : "RB")
    : "Backspace";

  const codesHtml = markingCodesHtml(props, counts);

  root.className = `stage stage--marking ${props.armed ? "armed" : ""} ${onPad ? "stage--marking-pad" : ""}`;
  root.innerHTML = `
    <section class="mark-main">
      <div class="status-row">
        <span class="status ${props.armed ? "status--live" : ""}">${props.armed ? "Armed" : "Paused"}</span>
        <span class="mono clock" id="clock">${clockText(props.session?.startedAt)}</span>
        <span class="meta">${props.session?.participantNumber ?? "—"} · ${props.session?.interviewNumber ?? "—"} · ${total} marks</span>
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
        <button type="button" class="btn" id="toggle-arm">${props.armed ? "Disarm" : "Arm"} shortcuts</button>
        <button type="button" class="btn btn--primary" id="end-session">End session → Review</button>
      </div>
      <p class="hint">Interview clock starts at 0:00. ${escapeHtml(undoKey)} undoes last mark. No sound. Keep eyes on the participant.</p>
    </section>
  `;

  const clock = root.querySelector("#clock");
  const timer = window.setInterval(() => {
    if (clock) clock.textContent = clockText(props.session?.startedAt);
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
