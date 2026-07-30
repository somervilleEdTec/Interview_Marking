import type {
  ButtonRole,
  ControllerProfile,
  LayoutButton,
} from "../input/controller-profiles";
import { bindGroupHtml, escapeHtml } from "./bind-targets";

type SlotButton = LayoutButton & {
  role: Extract<ButtonRole, { kind: "slot" }>;
};

function tile(slot: string, press: string, label: string | undefined): string {
  return `<div class="bind-tile" data-drop="1" data-slot="${escapeHtml(slot)}">
    <span class="bind-head">
      <span class="bind-slot mono">${escapeHtml(slot)}</span>
      <span class="bind-press mono">${escapeHtml(press)}</span>
    </span>
    <span class="bind-label ${label ? "" : "is-empty"}">${label ? escapeHtml(label) : "Drop criterion"}</span>
    ${label ? `<button type="button" class="bind-clear" data-sheet="${escapeHtml(label)}" title="Clear">✕</button>` : ""}
  </div>`;
}

export function padMapHtml(
  profile: ControllerProfile,
  byKey: Map<string, string>,
): string {
  const slots = profile.buttons.filter(
    (b): b is SlotButton => b.role.kind === "slot",
  );
  const primary = slots.filter((b) => b.role.layer === "primary");
  const secondary = slots.filter((b) => b.role.layer === "secondary");
  const labelOf = (role: ButtonRole["kind"]) =>
    profile.buttons.find((b) => b.role.kind === role)?.label ?? "";
  const modifier = labelOf("modifier") || "L1";

  const pressFor = (b: SlotButton) =>
    b.role.layer === "primary"
      ? b.label
      : `${modifier} + ${primary.find((p) => p.index === b.index)?.label ?? b.label}`;
  const tilesFor = (list: SlotButton[]) =>
    list
      .map((b) => tile(b.role.slot, pressFor(b), byKey.get(b.role.slot)))
      .join("");

  return `<div class="bind-groups" data-profile="${profile.id}">
    ${bindGroupHtml("Press", tilesFor(primary))}
    ${bindGroupHtml(`Hold ${modifier}`, tilesFor(secondary))}
    <p class="bind-fixed mono">
      <span>${escapeHtml(labelOf("undo"))} · Undo</span>
      <span>${escapeHtml(labelOf("general"))} · General</span>
      <span>${escapeHtml(labelOf("nofit"))} · No-fit</span>
    </p>
  </div>`;
}
