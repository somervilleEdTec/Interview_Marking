import { readFileSync, statSync } from "fs";
import type { TranscriptLine, TranscriptTurn } from "../model/types";
import { parseTranscriptTurns } from "./parse";
import { parseDocxBuffer } from "./parse-docx";
import { parsePdfBuffer } from "./parse-pdf";
import { turnsToLines } from "./turns";

/** Refuse oversized imports (DoS / memory) — interview transcripts are far smaller. */
export const MAX_TRANSCRIPT_BYTES = 40 * 1024 * 1024;

export interface LoadedTranscript {
  turns: TranscriptTurn[];
  lines: TranscriptLine[];
}

/** Load and parse a transcript path (text or binary). Does not modify the file. */
export async function loadTranscriptFile(
  filePath: string,
): Promise<LoadedTranscript> {
  const size = statSync(filePath).size;
  if (size > MAX_TRANSCRIPT_BYTES) {
    throw new Error(
      `Transcript file is too large (${Math.round(size / (1024 * 1024))} MB). Maximum is ${MAX_TRANSCRIPT_BYTES / (1024 * 1024)} MB.`,
    );
  }
  const lower = filePath.toLowerCase();
  let turns: TranscriptTurn[];
  if (lower.endsWith(".docx")) {
    turns = await parseDocxBuffer(readFileSync(filePath));
  } else if (lower.endsWith(".pdf")) {
    turns = await parsePdfBuffer(readFileSync(filePath));
  } else {
    const content = readFileSync(filePath, "utf8");
    turns = parseTranscriptTurns(filePath, content);
  }
  return { turns, lines: turnsToLines(turns) };
}
