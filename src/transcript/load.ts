import { readFileSync } from "fs";
import type { TranscriptLine, TranscriptTurn } from "../model/types";
import { parseTranscriptTurns } from "./parse";
import { parseDocxBuffer } from "./parse-docx";
import { parsePdfBuffer } from "./parse-pdf";
import { turnsToLines } from "./turns";

export interface LoadedTranscript {
  turns: TranscriptTurn[];
  lines: TranscriptLine[];
}

/** Load and parse a transcript path (text or binary). Does not modify the file. */
export async function loadTranscriptFile(
  filePath: string,
): Promise<LoadedTranscript> {
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
