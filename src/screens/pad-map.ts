import type { ControllerProfile } from "../input/controller-profiles";
import { escapeHtml } from "./bind-targets";
import { bindPadHtml, fixedRoleLabel } from "./face-layout";

export function padMapHtml(
  profile: ControllerProfile,
  byKey: Map<string, string>,
): string {
  const getLabel = (slot: string) => byKey.get(slot);

  return `<div class="bind-groups bind-groups--face" data-profile="${profile.id}">
    <div class="bind-group bind-group--pad">
      ${bindPadHtml(profile, getLabel)}
    </div>
    <p class="bind-fixed mono">
      <span>${escapeHtml(fixedRoleLabel(profile, "toggleArmed"))} · Start/Stop</span>
      <span>${escapeHtml(fixedRoleLabel(profile, "undo"))} · Undo</span>
      <span>Space · General</span>
      <span>N · No-fit</span>
    </p>
  </div>`;
}
