import type { Session } from "../model/types";
import { formatInterviewTime, markAtToMs } from "../model/time";
import { sessionHasTimedTranscript } from "../transcript/turns-for-merge";
import { escapeHtml } from "./bind-targets";

export interface ResolveProps {
  session: Session | null;
  onImport: () => void;
  onExportDocx: () => void;
  onMergeExport: () => void;
  onOffset: (sec: number) => void;
}

export function renderResolve(root: HTMLElement, props: ResolveProps): void {
  const session = props.session;
  root.className = "stage stage--resolve";
  if (!session) {
    root.innerHTML = `<section class="panel panel--wide"><p>No session.</p></section>`;
    return;
  }

  const hasTimed = sessionHasTimedTranscript(session);
  const hasCoded = session.marks.some((m) => !m.dropped && m.codeRef);
  const canMerge = hasTimed && hasCoded;
  const lineHint = hasTimed
    ? `${session.transcript?.length ?? session.transcriptTurns?.length ?? 0} timestamped lines`
    : session.transcriptTurns?.length
      ? "Transcript imported but has no timestamps — use SRT/VTT/DOCX/PDF"
      : "No transcript yet";

  root.innerHTML = `
    <section class="panel panel--wide">
      <h1>Transcript &amp; write-back</h1>
      <p class="lede">Import SRT, VTT, TXT, DOCX, or PDF. Merge needs a timestamped transcript and coded marks.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" id="import">Import transcript</button>
        <button type="button" class="btn" id="docx" ${session.transcript ? "" : "disabled"}>Download numbered .docx</button>
        <button type="button" class="btn" id="merge" ${canMerge ? "" : "disabled"}>Merge &amp; export Excel</button>
      </div>
      <label class="field">Alignment offset (seconds)
        <input id="offset" type="number" step="0.1" value="${session.recordingOffsetSec}" />
      </label>
      <p class="hint">Adjust so mark times (from 0:00) line up with the recording. ${escapeHtml(lineHint)}</p>
      <ul class="resolve-list">
        ${session.marks
          .filter((m) => !m.dropped)
          .map((m) => {
            const r = m.resolved;
            return `<li>
              <div class="resolve-head">
                <span class="mono">${formatInterviewTime(markAtToMs(m.at, session.startedAt))}</span>
                <span class="chip">${escapeHtml(m.slot)}</span>
                <strong>${escapeHtml(m.codeRef ?? "—")}</strong>
                <span class="mono">${r ? `L${r.lineStart}–${r.lineEnd}` : "unresolved"}</span>
              </div>
              <p class="extract">${escapeHtml(r?.text ?? "")}</p>
            </li>`;
          })
          .join("")}
      </ul>
    </section>
  `;

  root
    .querySelector("#import")
    ?.addEventListener("click", () => props.onImport());
  root
    .querySelector("#docx")
    ?.addEventListener("click", () => props.onExportDocx());
  root
    .querySelector("#merge")
    ?.addEventListener("click", () => props.onMergeExport());
  root.querySelector("#offset")?.addEventListener("change", (e) => {
    props.onOffset(Number((e.target as HTMLInputElement).value));
  });
}
