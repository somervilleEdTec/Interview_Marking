import { describe, it, expect } from "vitest";
import { markingCodesHtml } from "../src/screens/marking";
import { padMapHtml } from "../src/screens/pad-map";
import { profileById } from "../src/input/controller-profiles";
import type { Code } from "../src/model/types";

const codes: Code[] = [
  { sheetName: "Rapport", parent: null, rowCount: 1, key: "A" },
  { sheetName: "Probing", parent: null, rowCount: 1, key: "F" },
  { sheetName: "Idle", parent: null, rowCount: 0, key: null },
];

describe("markingCodesHtml", () => {
  it("hides unassigned slots in keyboard mode", () => {
    const html = markingCodesHtml({
      codes,
      flashSlot: null,
      inputMode: "keyboard",
      profile: null,
    });
    expect(html).toContain("Rapport");
    expect(html).toContain("Probing");
    expect(html).not.toContain("unassigned");
    expect(html).not.toContain("Idle");
    expect(html).not.toContain('data-slot="S"');
  });

  it("uses controller face diamond with Xbox X/Y/A/B", () => {
    const html = markingCodesHtml({
      codes,
      flashSlot: null,
      inputMode: "controller",
      profile: profileById("xbox"),
    });
    expect(html).toContain("face-diamond");
    expect(html).toContain(">X<");
    expect(html).toContain(">B<");
    expect(html).toContain("Rapport");
    expect(html).toContain("Probing");
    expect(html).not.toContain("unassigned");
    expect(html).not.toContain('data-slot="S"');
  });

  it("uses DualSense face names", () => {
    const html = markingCodesHtml({
      codes: [{ sheetName: "Theme", parent: null, rowCount: 0, key: "D" }],
      flashSlot: null,
      inputMode: "controller",
      profile: profileById("dualsense"),
    });
    expect(html).toContain("Cross");
    expect(html).toContain("Theme");
  });
});

describe("padMapHtml face layout", () => {
  it("renders diamond bind targets for all face slots", () => {
    const byKey = new Map([
      ["A", "Rapport"],
      ["J", "Probing"],
    ]);
    const html = padMapHtml(profileById("xbox"), byKey);
    expect(html).toContain("face-diamond");
    expect(html).toContain("LB + X");
    expect(html).toContain("Rapport");
    expect(html).toContain(">B<");
    expect(html).toContain("RB · Undo");
  });
});
