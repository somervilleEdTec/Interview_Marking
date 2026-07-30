import type { ControllerProfile } from "../input/controller-profiles";
import { escapeHtml } from "./bind-targets";
import { bindPadHtml, fixedRoleLabel } from "./face-layout";

export function padMapHtml(
  profile: ControllerProfile,
  byKey: Map<string, string>,
): string {
  const getLabel = (slot: string) => byKey.get(slot);
  const startBtn = fixedRoleLabel(profile, "toggleArmed");
  const undoBtn = fixedRoleLabel(profile, "undo");

  return `<div class="bind-groups bind-groups--face" data-profile="${profile.id}">
    <div class="bind-group bind-group--pad">
      ${bindPadHtml(profile, getLabel)}
    </div>
    <div class="bind-fixed">
      <p class="bind-fixed__title">Fixed controls (not for criteria)</p>
      <ul class="bind-fixed__list">
        <li><strong>${escapeHtml(startBtn)}</strong> — Start or stop marking on the Mark page</li>
        <li><strong>${escapeHtml(undoBtn)}</strong> — Undo the last mark</li>
        <li><strong>Space</strong> — Mark this moment (no criterion)</li>
        <li><strong>N</strong> — Doesn't fit any criterion</li>
      </ul>
    </div>
  </div>`;
}
