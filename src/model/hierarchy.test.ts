import { codeParent } from "./hierarchy";

describe("codeParent", () => {
  it("derives parent from punctuation", () => {
    expect(codeParent("risk.normalised")).toBe("risk");
    expect(codeParent("risk")).toBeNull();
  });
});
