import mammoth from "mammoth";
import type { TranscriptTurn } from "../model/types";
import { parseSpeakerTurns } from "./parse";

export async function parseDocxBuffer(
  buffer: Buffer,
): Promise<TranscriptTurn[]> {
  const result = await mammoth.extractRawText({ buffer });
  const turns = parseSpeakerTurns(result.value ?? "");
  if (!turns.length) {
    throw new Error(
      "DOCX has no [MM:SS] I:/P: turns — check the transcript export format",
    );
  }
  return turns;
}
