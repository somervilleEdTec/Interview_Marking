import { PDFParse } from "pdf-parse";
import type { TranscriptTurn } from "../model/types";
import { normalizeTranscriptText } from "./normalize-transcript-text";
import { parsePdfText } from "./parse";
import { countTimedTurns } from "./turns-for-merge";

export async function parsePdfBuffer(
  buffer: Buffer,
): Promise<TranscriptTurn[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const turns = parsePdfText(normalizeTranscriptText(result.text ?? ""));
    if (!countTimedTurns(turns)) {
      throw new Error(
        "PDF has no timestamps — expected [MM:SS] I:/P: turns or numbered HH:MM:SS segments",
      );
    }
    return turns;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
