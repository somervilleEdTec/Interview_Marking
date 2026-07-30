import ExcelJS from "exceljs";
import { copyFileSync, accessSync, constants } from "fs";
import { dirname, basename, join } from "path";
import { codeParent } from "../model/hierarchy";
import type { Code } from "../model/types";

export async function readCodes(workbookPath: string): Promise<Code[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(workbookPath);
  const codes: Code[] = [];
  wb.eachSheet((sheet) => {
    let rowCount = 0;
    sheet.eachRow({ includeEmpty: false }, (row, n) => {
      if (n === 1) return;
      const vals = row.values;
      if (
        Array.isArray(vals) &&
        vals.slice(1).some((v) => v != null && String(v).trim() !== "")
      ) {
        rowCount++;
      }
    });
    codes.push({
      sheetName: sheet.name,
      parent: codeParent(sheet.name),
      rowCount,
      key: null,
    });
  });
  return codes.sort((a, b) => b.rowCount - a.rowCount);
}

export function isWorkbookLocked(workbookPath: string): boolean {
  try {
    accessSync(workbookPath, constants.R_OK | constants.W_OK);
    // Try opening for append exclusive hint by renaming trick is unreliable;
    // attempt a non-destructive write probe via opening with ExcelJS later.
    return false;
  } catch {
    return true;
  }
}

/** Detect lock by attempting to open read/write stream-like access. */
export async function assertWritable(workbookPath: string): Promise<void> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(workbookPath);
    // Write to a temp path then compare — actual lock often throws on write
    const probe = workbookPath + ".writetest.tmp";
    await wb.xlsx.writeFile(probe);
    const { unlinkSync } = await import("fs");
    unlinkSync(probe);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Workbook appears locked or unwritable (close it in Excel and retry): ${msg}`,
    );
  }
}

export function backupWorkbook(workbookPath: string): string {
  const dir = dirname(workbookPath);
  const base = basename(workbookPath, ".xlsx");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(dir, `${base}.${stamp}.bak.xlsx`);
  copyFileSync(workbookPath, dest);
  return dest;
}

export interface AppendRow {
  sheetName: string;
  participantNumber: string;
  interviewNumber: string;
  lineRange: string;
  text: string;
}

export async function appendRows(
  workbookPath: string,
  rows: AppendRow[],
): Promise<string> {
  await assertWritable(workbookPath);
  const backupPath = backupWorkbook(workbookPath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(workbookPath);

  const bySheet = new Map<string, AppendRow[]>();
  for (const r of rows) {
    const list = bySheet.get(r.sheetName) ?? [];
    list.push(r);
    bySheet.set(r.sheetName, list);
  }

  for (const [sheetName, sheetRows] of bySheet) {
    const sheet = wb.getWorksheet(sheetName);
    if (!sheet) {
      throw new Error(
        `Worksheet "${sheetName}" does not exist — refuse to create sheets`,
      );
    }
    for (const r of sheetRows) {
      sheet.addRow([
        r.participantNumber,
        r.interviewNumber,
        r.lineRange,
        r.text,
      ]);
    }
  }

  await wb.xlsx.writeFile(workbookPath);
  return backupPath;
}
