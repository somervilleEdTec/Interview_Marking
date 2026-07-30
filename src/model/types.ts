/** Shared domain types — absolute wall-clock times only. */

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
  at: string;
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

export interface Session {
  id: string;
  participantNumber: string;
  interviewNumber: string;
  startedAt: string;
  defaultWindow: TimeWindow;
  marks: Mark[];
  transcript?: TranscriptLine[];
  /** Seconds to add to mark→recording mapping (manual correction). */
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
  at: string;
  code: string;
  kind: "first_mark" | "last_seen";
}
