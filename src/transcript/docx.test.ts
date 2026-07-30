import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import JSZip from "jszip";
import { writeNumberedDocx } from "./docx";

describe("writeNumberedDocx", () => {
  it("sanitizes ligatures and control chars in exported Word text", async () => {
    const dir = mkdtempSync(join(tmpdir(), "im-docx-"));
    const out = join(dir, "out.docx");
    try {
      await writeNumberedDocx(
        [
          {
            n: 1,
            startMs: 0,
            endMs: 1000,
            text: "parƟcipant ﬁeld\u0000",
          },
        ],
        out,
      );
      const zip = await JSZip.loadAsync(readFileSync(out));
      const xml = await zip.file("word/document.xml")!.async("string");
      expect(xml).toContain("participant field");
      expect(xml).not.toContain("Ɵ");
      expect(xml).not.toContain("\u0000");
      expect(xml).toContain("1. ");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
