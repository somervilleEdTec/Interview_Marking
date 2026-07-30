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
  it("maps L2 to general and Circle to undo", () => {
    const buttons = Array(16).fill(false);
    buttons[6] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "general" });
    buttons[6] = false;
    buttons[1] = true;
    expect(gamepadAction(buttons, false)).toEqual({ type: "undo" });
  });
});
