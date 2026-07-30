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

export function faceButtons(profile: ControllerProfile): SlotButton[] {
  const byZone = new Map(
    profile.buttons
      .filter(
        (b): b is SlotButton =>
          b.role.kind === "slot" && b.role.group === "face",
      )
      .map((b) => [b.zone, b]),
  );
  return (["face-n", "face-w", "face-e", "face-s"] as const)
    .map((z) => byZone.get(z))
    .filter(Boolean) as SlotButton[];
}

export function shoulderButtons(profile: ControllerProfile): SlotButton[] {
  const order = [
    "shoulder-lb",
    "shoulder-lt",
    "shoulder-rb",
    "shoulder-rt",
  ] as const;
  const byZone = new Map(
    profile.buttons
      .filter(
        (b): b is SlotButton =>
          b.role.kind === "slot" && b.role.group === "shoulder",
      )
      .map((b) => [b.zone, b]),
  );
  return order.map((z) => byZone.get(z)).filter(Boolean) as SlotButton[];
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
  getLabel: (slot: string) => string | undefined,
  opts?: {
    hideUnassigned?: boolean;
    counts?: Map<string, number>;
    flashSlot?: string | null;
  },
): Partial<Record<FaceDir, FaceCell>> {
  const cells: Partial<Record<FaceDir, FaceCell>> = {};
  for (const b of buttons) {
    const dir = FACE_ZONE_TO_DIR[b.zone];
    if (!dir) continue;
    const label = getLabel(b.role.slot);
    if (opts?.hideUnassigned && !label) continue;
    cells[dir] = {
      slot: b.role.slot,
      press: b.label,
      label: label ?? "",
      count: opts?.counts?.get(b.role.slot) ?? 0,
      flash: opts?.flashSlot === b.role.slot,
    };
  }
  return cells;
}

function shoulderTileHtml(
  button: SlotButton,
  label: string | undefined,
  mode: "mark" | "bind",
  opts?: { count?: number; flash?: boolean },
): string {
  if (mode === "mark") {
    if (!label) return "";
    const flash = opts?.flash ? " flash" : "";
    return `<div class="shoulder-btn${flash}" data-slot="${escapeHtml(button.role.slot)}">
      <span class="tile-key">${escapeHtml(button.label)}</span>
      <span class="tile-name">${escapeHtml(label)}</span>
      <span class="tile-count mono">${opts?.count ?? 0}</span>
    </div>`;
  }
  return `<div class="shoulder-btn shoulder-btn--bind" data-drop="1" data-slot="${escapeHtml(button.role.slot)}">
    <span class="bind-press mono">${escapeHtml(button.label)}</span>
    <span class="bind-label ${label ? "" : "is-empty"}">${label ? escapeHtml(label) : "Drop criterion"}</span>
    ${label ? `<button type="button" class="bind-clear" data-sheet="${escapeHtml(label)}" title="Clear">✕</button>` : ""}
  </div>`;
}

export function shoulderRowHtml(
  buttons: SlotButton[],
  getLabel: (slot: string) => string | undefined,
  mode: "mark" | "bind",
  opts?: {
    hideUnassigned?: boolean;
    counts?: Map<string, number>;
    flashSlot?: string | null;
  },
): string {
  const tiles = buttons
    .map((b) => {
      const label = getLabel(b.role.slot);
      if (opts?.hideUnassigned && !label) return "";
      return shoulderTileHtml(b, label, mode, {
        count: opts?.counts?.get(b.role.slot) ?? 0,
        flash: opts?.flashSlot === b.role.slot,
      });
    })
    .filter(Boolean);
  if (!tiles.length) return "";
  return `<div class="shoulder-row">${tiles.join("")}</div>`;
}

export function fixedRoleLabel(
  profile: ControllerProfile,
  kind: "undo",
): string {
  return profile.buttons.find((b) => b.role.kind === kind)?.label ?? kind;
}
