import { describe, it, expect } from "vitest";
import { padMapHtml } from "../src/screens/pad-map";
import { keyMapHtml } from "../src/screens/key-map";
import { profileById } from "../src/input/controller-profiles";
import { CODE_SLOTS } from "../src/model/types";
import type { Code } from "../src/model/types";

const codes: Code[] = [
  { sheetName: "Rapport", parent: null, rowCount: 3, key: "A" },
  { sheetName: "Probing", parent: null, rowCount: 2, key: "J" },
];
const byKey = new Map(codes.map((c) => [c.key!, c.sheetName]));

describe("padMapHtml", () => {
  const html = padMapHtml(profileById("xbox"), byKey);

  it("shows all eight slots without a layer toggle", () => {
    for (const slot of CODE_SLOTS) {
      expect(html).toContain(`data-slot="${slot}"`);
    }
    expect(html).not.toContain("data-layer");
  });

  it("labels secondary slots with the modifier plus the face button", () => {
    expect(html).toContain("LB + X");
    expect(html).toContain("Rapport");
    expect(html).toContain("Probing");
  });
});

describe("keyMapHtml", () => {
  const html = keyMapHtml(codes, byKey);

  it("offers a select per home-row key with the bound criterion chosen", () => {
    for (const slot of CODE_SLOTS) {
      expect(html).toContain(`data-slot="${slot}"`);
    }
    expect(html).toContain('<option value="Rapport" selected>Rapport</option>');
  });

  it("disables selects until criteria exist", () => {
    expect(keyMapHtml([], new Map())).toContain("Type criteria first");
  });
});
