import { exportCodebookCsv } from "../src/storage/store";
import { gamepadAction } from "../src/input/action-map";

describe("exportCodebookCsv", () => {
  it("emits header and rows", () => {
    const csv = exportCodebookCsv([
      { sheetName: "risk.normalised", parent: "risk", rowCount: 3 },
    ]);
    expect(csv.split("\n")[0]).toBe("sheetName,parent,rowCount");
    expect(csv).toContain("risk.normalised");
  });
});

describe("gamepadAction", () => {
  it("maps LT/RT to shoulder slots and Menu to undo", () => {
    const buttons = Array(16).fill(false);
    buttons[6] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "code", slot: "K" });
    buttons[6] = false;
    buttons[7] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "code", slot: ";" });
    buttons[7] = false;
    buttons[9] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "undo" });
  });
});
