import type {
  ButtonRole,
  ControllerProfile,
  LayoutButton,
} from "../input/controller-profiles";
import { escapeHtml } from "./bind-targets";

type SlotButton = LayoutButton & {
  role: Extract<ButtonRole, { kind: "slot" }>;
};

type FaceDir = "n" | "w" | "e" | "s";

const FACE_ZONE_TO_DIR: Record<string, FaceDir> = {
  "face-n": "n",
  "face-w": "w",
  "face-e": "e",
  "face-s": "s",
};

export interface FaceCell {
  slot: string;
  press: string;
  label: string;
  flash?: boolean;
  count?: number;
}

function primaryFace(profile: ControllerProfile): SlotButton[] {
  return profile.buttons.filter(
    (b): b is SlotButton =>
      b.role.kind === "slot" && b.role.layer === "primary",
  );
}

export function facePrimaryButtons(profile: ControllerProfile): SlotButton[] {
  const byZone = new Map(primaryFace(profile).map((b) => [b.zone, b]));
  return (["face-n", "face-w", "face-e", "face-s"] as const)
    .map((z) => byZone.get(z))
    .filter(Boolean) as SlotButton[];
}

export function faceSecondaryButtons(profile: ControllerProfile): SlotButton[] {
  const secs = profile.buttons.filter(
    (b): b is SlotButton =>
      b.role.kind === "slot" && b.role.layer === "secondary",
  );
  const byIndex = new Map(secs.map((b) => [b.index, b]));
  return facePrimaryButtons(profile)
    .map((p) => byIndex.get(p.index))
    .filter(Boolean) as SlotButton[];
}

export function facePressLabel(
  profile: ControllerProfile,
  button: SlotButton,
): string {
  if (button.role.layer === "primary") return button.label;
  const mod =
    profile.buttons.find((b) => b.role.kind === "modifier")?.label ?? "L1";
  const face =
    primaryFace(profile).find((p) => p.index === button.index)?.label ??
    button.label;
  return `${mod} + ${face}`;
}

function dirForSlotButton(
  profile: ControllerProfile,
  button: SlotButton,
): FaceDir | null {
  if (button.role.layer === "primary") {
    return FACE_ZONE_TO_DIR[button.zone] ?? null;
  }
  const primary = primaryFace(profile).find((p) => p.index === button.index);
  return primary ? (FACE_ZONE_TO_DIR[primary.zone] ?? null) : null;
}

function markCellHtml(cell: FaceCell, dir: FaceDir): string {
  const flash = cell.flash ? " flash" : "";
  return `<div class="face-btn face-btn--${dir}${flash}" data-slot="${escapeHtml(cell.slot)}">
    <span class="tile-key">${escapeHtml(cell.press)}</span>
    <span class="tile-name">${escapeHtml(cell.label)}</span>
    <span class="tile-count mono">${cell.count ?? 0}</span>
  </div>`;
}

function bindCellHtml(cell: FaceCell, dir: FaceDir): string {
  return `<div class="face-btn face-btn--${dir} face-btn--bind" data-drop="1" data-slot="${escapeHtml(cell.slot)}">
    <span class="bind-head">
      <span class="bind-press mono">${escapeHtml(cell.press)}</span>
    </span>
    <span class="bind-label ${cell.label ? "" : "is-empty"}">${cell.label ? escapeHtml(cell.label) : "Drop criterion"}</span>
    ${cell.label ? `<button type="button" class="bind-clear" data-sheet="${escapeHtml(cell.label)}" title="Clear">✕</button>` : ""}
  </div>`;
}

/** Diamond geometry matching controller face (N/W/E/S). */
export function faceDiamondHtml(
  cells: Partial<Record<FaceDir, FaceCell>>,
  mode: "mark" | "bind",
): string {
  const render = mode === "mark" ? markCellHtml : bindCellHtml;
  const cell = (dir: FaceDir) => {
    const c = cells[dir];
    return c
      ? render(c, dir)
      : `<div class="face-btn face-btn--${dir} face-btn--empty" aria-hidden="true"></div>`;
  };
  return `<div class="face-diamond">
    <div class="face-diamond__pad">
      ${cell("n")}
      ${cell("w")}
      ${cell("e")}
      ${cell("s")}
    </div>
  </div>`;
}

export function slotButtonsToFaceCells(
  buttons: SlotButton[],
  profile: ControllerProfile,
  getLabel: (slot: string) => string | undefined,
  opts?: {
    hideUnassigned?: boolean;
    counts?: Map<string, number>;
    flashSlot?: string | null;
  },
): Partial<Record<FaceDir, FaceCell>> {
  const cells: Partial<Record<FaceDir, FaceCell>> = {};
  for (const b of buttons) {
    const dir = dirForSlotButton(profile, b);
    if (!dir) continue;
    const label = getLabel(b.role.slot);
    if (opts?.hideUnassigned && !label) continue;
    cells[dir] = {
      slot: b.role.slot,
      press: facePressLabel(profile, b),
      label: label ?? "",
      count: opts?.counts?.get(b.role.slot) ?? 0,
      flash: opts?.flashSlot === b.role.slot,
    };
  }
  return cells;
}

export function fixedRoleLabel(
  profile: ControllerProfile,
  kind: "undo" | "general" | "nofit" | "modifier",
): string {
  return profile.buttons.find((b) => b.role.kind === kind)?.label ?? kind;
}
