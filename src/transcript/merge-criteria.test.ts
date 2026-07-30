import { mkdtempSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import ExcelJS from "exceljs";
import { mergeCriteriaByNearestTimestamp } from "./merge-criteria";
import { writeTaggedExport } from "../excel/tagged-export";
import type { Mark, TranscriptTurn } from "../model/types";

function mark(
  partial: Partial<Mark> & { id: string; at: number; codeRef: string },
): Mark {
  return {
    slot: "A",
    window: { before: 45, after: 15 },
    dropped: false,
    ...partial,
  };
}

const turns: TranscriptTurn[] = [
  { startMs: 0, endMs: null, speaker: "I", text: "Intro" },
  { startMs: 50_000, endMs: null, speaker: "P", text: "Yeah fine" },
  { startMs: 90_000, endMs: null, speaker: null, text: "Broad start" },
];

describe("mergeCriteriaByNearestTimestamp", () => {
  it("links mark to nearest turn start", () => {
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [mark({ id: "1", at: 48_000, codeRef: "risk" })],
      0,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].criteria).toBe("");
    expect(rows[1].criteria).toBe("risk");
    expect(rows[1].speaker).toBe("P");
    expect(rows[1].response).toBe("Yeah fine");
    expect(rows[2].criteria).toBe("");
  });

  it("prefers earlier turn on equal distance", () => {
    // Midway between 0 and 50_000
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [mark({ id: "1", at: 25_000, codeRef: "agency" })],
      0,
    );
    expect(rows[0].criteria).toBe("agency");
    expect(rows[1].criteria).toBe("");
  });

  it("dedupes criteria on same turn in mark-time order", () => {
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [
        mark({ id: "1", at: 49_000, codeRef: "risk" }),
        mark({ id: "2", at: 51_000, codeRef: "agency" }),
        mark({ id: "3", at: 52_000, codeRef: "risk" }),
      ],
      0,
    );
    expect(rows[1].criteria).toBe("risk; agency");
  });

  it("preserves blank speaker when source had none", () => {
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [mark({ id: "1", at: 90_000, codeRef: "identity" })],
      0,
    );
    expect(rows[2].speaker).toBe("");
    expect(rows[2].criteria).toBe("identity");
  });

  it("applies recording offset", () => {
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [mark({ id: "1", at: 0, codeRef: "risk" })],
      50,
    );
    expect(rows[1].criteria).toBe("risk");
  });

  it("refuses transcripts without timestamps", () => {
    expect(() =>
      mergeCriteriaByNearestTimestamp(
        [{ startMs: null, endMs: null, speaker: null, text: "prose" }],
        [mark({ id: "1", at: 0, codeRef: "risk" })],
        0,
      ),
    ).toThrow(/no timestamps/);
  });

  it("ignores dropped and uncoded marks", () => {
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [
        mark({ id: "1", at: 50_000, codeRef: "risk", dropped: true }),
        { ...mark({ id: "2", at: 50_000, codeRef: "x" }), codeRef: null },
      ],
      0,
    );
    expect(rows.every((r) => r.criteria === "")).toBe(true);
  });
});

describe("writeTaggedExport", () => {
  it("writes A–D headers and row values", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tagged-"));
    const out = join(dir, "out.xlsx");
    const rows = mergeCriteriaByNearestTimestamp(
      turns,
      [mark({ id: "1", at: 50_000, codeRef: "risk" })],
      0,
    );
    await writeTaggedExport(rows, out);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(out);
    const sheet = wb.worksheets[0];
    expect(sheet.getRow(1).values?.slice(1)).toEqual([
      "Timestamp",
      "Criteria",
      "Speaker",
      "Response",
    ]);
    expect(sheet.getRow(3).getCell(2).value).toBe("risk");
    expect(sheet.getRow(3).getCell(3).value).toBe("P");
    expect(sheet.getRow(3).getCell(4).value).toBe("Yeah fine");
    unlinkSync(out);
  });
});
