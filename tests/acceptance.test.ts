import { describe, it, expect } from "vitest";
import { KEYBOARD_MAP } from "../src/input/action-map";

describe("acceptance helpers", () => {
  it("maps home-row marking keys without number row", () => {
    for (const k of [
      "A",
      "S",
      "D",
      "F",
      "J",
      "K",
      "L",
      ";",
      "Space",
      "N",
      "Backspace",
    ]) {
      expect(KEYBOARD_MAP[k]).toBeTruthy();
    }
    expect(KEYBOARD_MAP["1"]).toBeUndefined();
  });
});
