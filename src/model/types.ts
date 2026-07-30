/** Shared domain types — mark times are interview-relative (ms from 0:00). */

export type MarkSlot =
  "A" | "S" | "D" | "F" | "J" | "K" | "L" | ";" | "general" | "nofit";

export const CODE_SLOTS: Exclude<MarkSlot, "general" | "nofit">[] = [
  "A",
  "S",
  "D",
  "F",
  "J",
  "K",
  "L",
  ";",
];

export interface TimeWindow {
  before: number;
  after: number;
}

export interface Code {
  sheetName: string;
  parent: string | null;
  rowCount: number;
  key: Exclude<MarkSlot, "general" | "nofit"> | null;
}

export interface ResolvedMark {
  lineStart: number;
  lineEnd: number;
  text: string;
}

export interface Mark {
  id: string;
  /** Milliseconds from interview start (0:00). */
  at: number;
  slot: MarkSlot;
  codeRef: string | null;
  window: TimeWindow;
  dropped: boolean;
  note: string;
  resolved?: ResolvedMark;
}

export interface TranscriptLine {
  n: number;
  startMs: number;
  endMs: number;
  text: string;
}

/** Parsed transcript unit — speaker only when present in the source file. */
export interface TranscriptTurn {
  startMs: number | null;
  endMs: number | null;
  speaker: string | null;
  text: string;
}

export interface Session {
  id: string;
  participantNumber: string;
  interviewNumber: string;
  /** Wall-clock session open time (metadata / live elapsed only). */
  startedAt: string;
  /**
   * When set, the interview clock is frozen at this elapsed ms (Stop).
   * Cleared on Start; adjusted `startedAt` resumes from this value.
   */
  pausedElapsedMs?: number;
  defaultWindow: TimeWindow;
  marks: Mark[];
  transcript?: TranscriptLine[];
  /** Full parsed turns (incl. speaker when source had it) for merge export. */
  transcriptTurns?: TranscriptTurn[];
  /** Seconds added when aligning marks to the recording/transcript. */
  recordingOffsetSec: number;
  armed: boolean;
}

export interface Project {
  workbookPath: string;
  /** Worksheet names from the last workbook pick — used as criteria suggestions. */
  workbookSheets?: string[];
  codes: Code[];
  sessions: Session[];
}

export interface SaturationEvent {
  /** Interview-relative ms (same basis as Mark.at). */
  at: number;
  code: string;
  kind: "first_mark" | "last_seen";
}
