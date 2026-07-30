import { Document, Packer, Paragraph, TextRun } from "docx";
import type { TranscriptLine } from "../model/types";
import { writeFileSync } from "fs";

export async function writeNumberedDocx(
  lines: TranscriptLine[],
  outPath: string,
): Promise<void> {
  const children = lines.map(
    (l) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${l.n}\t`, bold: true }),
          new TextRun(l.text),
        ],
      }),
  );
  const doc = new Document({
    sections: [{ children }],
  });
  const buf = await Packer.toBuffer(doc);
  writeFileSync(outPath, buf);
}
