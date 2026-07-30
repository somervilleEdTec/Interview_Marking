import ExcelJS from "exceljs";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { appendRows, readCodes, backupWorkbook } from "./workbook";

describe("workbook append", () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "im-xlsx-"));
    path = join(dir, "coding.xlsx");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("risk.normalised");
    ws.addRow([
      "Participant Number",
      "Interview Number",
      "Line Number(s)",
      "Extract",
    ]);
    ws.addRow(["P0", "I0", "1–2", "existing"]);
    await wb.xlsx.writeFile(path);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads codes from sheet names", async () => {
    const codes = await readCodes(path);
    expect(codes[0].sheetName).toBe("risk.normalised");
    expect(codes[0].rowCount).toBe(1);
  });

  it("backs up and appends without creating sheets", async () => {
    const bak = backupWorkbook(path);
    expect(bak).toMatch(/\.bak\.xlsx$/);
    await appendRows(path, [
      {
        sheetName: "risk.normalised",
        participantNumber: "P1",
        interviewNumber: "I1",
        lineRange: "3–4",
        text: "new extract",
      },
    ]);
    const codes = await readCodes(path);
    expect(codes[0].rowCount).toBe(2);
  });

  it("refuses to create missing worksheets", async () => {
    await expect(
      appendRows(path, [
        {
          sheetName: "does.not.exist",
          participantNumber: "P1",
          interviewNumber: "I1",
          lineRange: "1–1",
          text: "x",
        },
      ]),
    ).rejects.toThrow(/does not exist/);
  });
});
