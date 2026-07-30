import mammoth from "mammoth";
import type { TranscriptTurn } from "../model/types";
import { parseNumberedSegments, parseSpeakerTurns } from "./parse";
import { countTimedTurns } from "./turns-for-merge";

export async function parseDocxBuffer(
  buffer: Buffer,
): Promise<TranscriptTurn[]> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value ?? "";
  let turns = parseSpeakerTurns(text);
  if (!countTimedTurns(turns)) {
    turns = parseNumberedSegments(text);
  }
  if (!countTimedTurns(turns)) {
    throw new Error(
      "DOCX has no timestamps — use [MM:SS] I:/P: turns, numbered HH:MM:SS lines, or import SRT/VTT",
    );
  }
  return turns;
}
