import { Document, Packer, Paragraph, TextRun } from "docx";
import type { TranscriptLine } from "../model/types";
import { writeFileSync } from "fs";
import { normalizeTranscriptText } from "./normalize-transcript-text";

export async function writeNumberedDocx(
  lines: TranscriptLine[],
  outPath: string,
): Promise<void> {
  const children = lines.map((l) => {
    const text = normalizeTranscriptText(l.text);
    return new Paragraph({
      children: [
        new TextRun({ text: `${l.n}. `, bold: true }),
        new TextRun({ text }),
      ],
    });
  });
  const doc = new Document({
    sections: [{ children }],
  });
  const buf = await Packer.toBuffer(doc);
  writeFileSync(outPath, buf);
}
