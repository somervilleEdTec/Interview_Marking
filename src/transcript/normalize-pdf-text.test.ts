import { describe, it, expect } from "vitest";
import { normalizePdfText } from "./normalize-pdf-text";

describe("normalizePdfText", () => {
  it("repairs mis-mapped ligatures from PDF extract", () => {
    const raw =
      "parƟcipant quesƟon aŌerwards LeŌ wriƩen beƩer puƫng ﬁne ﬂow";
    expect(normalizePdfText(raw)).toBe(
      "participant question afterwards Left written better putting fine flow",
    );
  });

  it("leaves legitimate Norwegian letters alone", () => {
    expect(normalizePdfText("Åsmund and café")).toBe("Åsmund and café");
  });
});
