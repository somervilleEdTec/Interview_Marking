import ExcelJS from "exceljs";
import type { MergedRow } from "../transcript/merge-criteria";
import { normalizeTranscriptText } from "../transcript/normalize-transcript-text";

/** Write a new workbook: Timestamp | Criteria | Speaker | Response. */
export async function writeTaggedExport(
  rows: MergedRow[],
  outPath: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Tagged transcript");
  sheet.addRow(["Timestamp", "Criteria", "Speaker", "Response"]);
  for (const r of rows) {
    sheet.addRow([
      r.timestamp,
      r.criteria,
      normalizeTranscriptText(r.speaker),
      normalizeTranscriptText(r.response),
    ]);
  }
  await wb.xlsx.writeFile(outPath);
}
