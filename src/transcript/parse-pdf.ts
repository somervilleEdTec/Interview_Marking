import { PDFParse } from "pdf-parse";
import type { TranscriptTurn } from "../model/types";
import { normalizePdfText } from "./normalize-pdf-text";
import { parsePdfText } from "./parse";

export async function parsePdfBuffer(
  buffer: Buffer,
): Promise<TranscriptTurn[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return parsePdfText(normalizePdfText(result.text ?? ""));
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
