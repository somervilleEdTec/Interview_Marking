import type {
  ButtonRole,
  ControllerProfile,
  LayoutButton,
} from "../input/controller-profiles";
import { escapeHtml } from "./bind-targets";
import {
  faceDiamondHtml,
  facePrimaryButtons,
  faceSecondaryButtons,
  fixedRoleLabel,
  slotButtonsToFaceCells,
} from "./face-layout";

type SlotButton = LayoutButton & {
  role: Extract<ButtonRole, { kind: "slot" }>;
};

export function padMapHtml(
  profile: ControllerProfile,
  byKey: Map<string, string>,
): string {
  const getLabel = (slot: string) => byKey.get(slot);
  const primary = slotButtonsToFaceCells(
    facePrimaryButtons(profile) as SlotButton[],
    profile,
    getLabel,
  );
  const secondary = slotButtonsToFaceCells(
    faceSecondaryButtons(profile) as SlotButton[],
    profile,
    getLabel,
  );
  const mod = fixedRoleLabel(profile, "modifier");

  return `<div class="bind-groups bind-groups--face" data-profile="${profile.id}">
    <div class="bind-group">
      <h3 class="bind-group-head">Press</h3>
      ${faceDiamondHtml(primary, "bind")}
    </div>
    <div class="bind-group">
      <h3 class="bind-group-head">Hold ${escapeHtml(mod)}</h3>
      ${faceDiamondHtml(secondary, "bind")}
    </div>
    <p class="bind-fixed mono">
      <span>${escapeHtml(fixedRoleLabel(profile, "undo"))} · Undo</span>
      <span>${escapeHtml(fixedRoleLabel(profile, "general"))} · General</span>
      <span>${escapeHtml(fixedRoleLabel(profile, "nofit"))} · No-fit</span>
    </p>
  </div>`;
}
