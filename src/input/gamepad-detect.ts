import {
  matchProfile,
  type ControllerProfile,
  type ControllerProfileId,
} from "./controller-profiles";

export interface DetectedPad {
  index: number;
  id: string;
  mapping: string;
  profileId: ControllerProfileId;
  profile: ControllerProfile;
  label: string;
  connected: boolean;
}

export function labelForPad(id: string, profile: ControllerProfile): string {
  const short = id.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const clipped = short.length > 42 ? `${short.slice(0, 40)}…` : short;
  return clipped || profile.displayName;
}

/** Normalize navigator.getGamepads() into connected pad descriptors. */
export function listConnectedPads(
  pads: Array<Gamepad | null | undefined>,
): DetectedPad[] {
  const out: DetectedPad[] = [];
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (!pad || !pad.connected) continue;
    const profile = matchProfile(pad.id, pad.mapping);
    out.push({
      index: pad.index,
      id: pad.id,
      mapping: pad.mapping,
      profileId: profile.id,
      profile,
      label: labelForPad(pad.id, profile),
      connected: true,
    });
  }
  return out;
}

/** Prefer assigned id; else first connected pad. */
export function resolveAssignedPad(
  pads: DetectedPad[],
  assignedId: string | null,
): DetectedPad | null {
  if (!pads.length) return null;
  if (assignedId) {
    const hit = pads.find((p) => p.id === assignedId);
    if (hit) return hit;
  }
  return pads[0] ?? null;
}
