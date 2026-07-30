import type { ControllerProfile } from "../input/controller-profiles";
import { escapeHtml } from "./bind-targets";
import {
  faceButtons,
  faceDiamondHtml,
  fixedRoleLabel,
  shoulderButtons,
  shoulderRowHtml,
  slotButtonsToFaceCells,
} from "./face-layout";

export function padMapHtml(
  profile: ControllerProfile,
  byKey: Map<string, string>,
): string {
  const getLabel = (slot: string) => byKey.get(slot);
  const face = slotButtonsToFaceCells(faceButtons(profile), getLabel);
  const shoulders = shoulderRowHtml(shoulderButtons(profile), getLabel, "bind");

  return `<div class="bind-groups bind-groups--face" data-profile="${profile.id}">
    <div class="bind-group">
      <h3 class="bind-group-head">Face</h3>
      ${faceDiamondHtml(face, "bind")}
    </div>
    <div class="bind-group">
      <h3 class="bind-group-head">Shoulders</h3>
      ${shoulders}
    </div>
    <p class="bind-fixed mono">
      <span>${escapeHtml(fixedRoleLabel(profile, "toggleArmed"))} · Start/Stop</span>
      <span>${escapeHtml(fixedRoleLabel(profile, "undo"))} · Undo</span>
      <span>Space · General</span>
      <span>N · No-fit</span>
    </p>
  </div>`;
}
