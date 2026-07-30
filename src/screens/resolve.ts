import type { Session } from "../model/types";
import { formatInterviewTime, markAtToMs } from "../model/time";
import { sessionHasTimedTranscript } from "../transcript/turns-for-merge";

export interface ResolveProps {
  session: Session | null;
  onImport: () => void;
  onExportDocx: () => void;
  onMergeExport: () => void;
  onOffset: (sec: number) => void;
  onWindow: (markId: string, before: number, after: number) => void;
  onAppend: () => void;
  onCodebook: () => void;
}

export function renderResolve(root: HTMLElement, props: ResolveProps): void {
  const session = props.session;
  root.className = "stage stage--resolve";
  if (!session) {
    root.innerHTML = `<section class="panel panel--wide"><p>No session.</p></section>`;
    return;
  }

  const preview = session.marks.filter(
    (m) => !m.dropped && m.codeRef && m.resolved,
  );
  const bySheet = new Map<string, typeof preview>();
  for (const m of preview) {
    const list = bySheet.get(m.codeRef!) ?? [];
    list.push(m);
    bySheet.set(m.codeRef!, list);
  }

  const hasTimed = sessionHasTimedTranscript(session);
  const hasCoded = session.marks.some((m) => !m.dropped && m.codeRef);
  const canMerge = hasTimed && hasCoded;

  root.innerHTML = `
    <section class="panel panel--wide">
      <h1>Transcript &amp; write-back</h1>
      <p class="lede">Import SRT, VTT, TXT, DOCX, or PDF. Merge needs a timestamped transcript and coded marks.</p>
      <div class="row">
        <button type="button" class="btn btn--primary" id="import">Import transcript</button>
        <button type="button" class="btn" id="docx" ${session.transcript ? "" : "disabled"}>Download numbered .docx</button>
        <button type="button" class="btn" id="merge" ${canMerge ? "" : "disabled"}>Merge &amp; export Excel</button>
        <button type="button" class="btn" id="codebook">Export codebook CSV</button>
      </div>
      <label class="field">Alignment offset (seconds)
        <input id="offset" type="number" step="0.1" value="${session.recordingOffsetSec}" />
      </label>
      <p class="hint">Adjust so mark times (from 0:00) line up with the recording. ${
        hasTimed
          ? `${session.transcript?.length ?? session.transcriptTurns?.length ?? 0} timestamped lines`
          : session.transcriptTurns?.length
            ? "Transcript imported but has no timestamps — use SRT/VTT/DOCX/PDF"
            : "No transcript yet"
      }</p>
      <ul class="resolve-list">
        ${session.marks
          .filter((m) => !m.dropped)
          .map((m) => {
            const r = m.resolved;
            return `<li>
              <div class="resolve-head">
                <span class="mono">${formatInterviewTime(markAtToMs(m.at, session.startedAt))}</span>
                <span class="chip">${m.slot}</span>
                <strong>${m.codeRef ?? "—"}</strong>
                <span class="mono">${r ? `L${r.lineStart}–${r.lineEnd}` : "unresolved"}</span>
              </div>
              <p class="extract">${r?.text ?? ""}</p>
              <div class="row">
                <label>before <input data-win-before="${m.id}" type="number" value="${m.window.before}" /></label>
                <label>after <input data-win-after="${m.id}" type="number" value="${m.window.after}" /></label>
              </div>
            </li>`;
          })
          .join("")}
      </ul>
      <h2>Append preview</h2>
      ${
        [...bySheet.entries()]
          .map(
            ([sheet, marks]) =>
              `<div class="preview-sheet"><h3>${sheet} (+${marks.length})</h3>
            <ul>${marks.map((m) => `<li class="mono">${session.participantNumber} | ${session.interviewNumber} | ${m.resolved!.lineStart}–${m.resolved!.lineEnd} | ${m.resolved!.text.slice(0, 80)}</li>`).join("")}</ul></div>`,
          )
          .join("") || '<p class="ink-3">Nothing ready to append.</p>'
      }
      <button type="button" class="btn btn--primary" id="append" ${preview.length ? "" : "disabled"}>
        Backup &amp; append to Excel
      </button>
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
  root
    .querySelector("#codebook")
    ?.addEventListener("click", () => props.onCodebook());
  root
    .querySelector("#append")
    ?.addEventListener("click", () => props.onAppend());
  root.querySelector("#offset")?.addEventListener("change", (e) => {
    props.onOffset(Number((e.target as HTMLInputElement).value));
  });
  root.querySelectorAll("[data-win-before]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const id = (inp as HTMLElement).dataset.winBefore!;
      const before = Number((inp as HTMLInputElement).value);
      const afterEl = root.querySelector(
        `[data-win-after="${id}"]`,
      ) as HTMLInputElement;
      props.onWindow(id, before, Number(afterEl.value));
    });
  });
  root.querySelectorAll("[data-win-after]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const id = (inp as HTMLElement).dataset.winAfter!;
      const after = Number((inp as HTMLInputElement).value);
      const beforeEl = root.querySelector(
        `[data-win-before="${id}"]`,
      ) as HTMLInputElement;
      props.onWindow(id, Number(beforeEl.value), after);
    });
  });
}
