import type { Code, Session } from "../model/types";
import { formatInterviewTime, markAtToMs } from "../model/time";
import { escapeHtml } from "./bind-targets";

export interface ReviewProps {
  session: Session | null;
  codes: Code[];
  averageMarks: number;
  onChange: (session: Session) => void;
  onContinue: () => void;
}

export function renderReview(root: HTMLElement, props: ReviewProps): void {
  const session = props.session;
  root.className = "stage stage--review";
  if (!session) {
    root.innerHTML = `<section class="panel panel--wide"><p>No session yet.</p></section>`;
    return;
  }
  const kept = session.marks.filter((m) => !m.dropped).length;
  root.innerHTML = `
    <section class="panel panel--wide">
      <h1>Review</h1>
      <p class="lede">This session: <strong>${kept}</strong> marks · running average: <strong>${props.averageMarks.toFixed(1)}</strong>. Times are minutes:seconds from interview start (0:00).</p>
      <label class="field">Alignment offset (seconds)
        <input id="offset" type="number" step="1" value="${Math.round(session.recordingOffsetSec)}" />
      </label>
      <p class="hint">Shift all marks on the recording/transcript timeline without changing when they were pressed in the interview.</p>
      <ul class="mark-list">
        ${session.marks
          .map((m) => {
            const time = formatInterviewTime(
              markAtToMs(m.at, session.startedAt),
            );
            const label =
              m.codeRef ?? (m.slot === "nofit" ? "nofit" : "general");
            return `<li class="${m.dropped ? "dropped" : ""}" data-id="${escapeHtml(m.id)}">
              <span class="mono">${time}</span>
              <span class="chip">${escapeHtml(m.slot)}</span>
              <span>${escapeHtml(label)}</span>
              ${
                m.slot === "general" && !m.codeRef
                  ? `<select data-assign="${escapeHtml(m.id)}">
                      <option value="">Assign code…</option>
                      ${props.codes.map((c) => `<option value="${escapeHtml(c.sheetName)}">${escapeHtml(c.sheetName)}</option>`).join("")}
                    </select>`
                  : ""
              }
              <button type="button" data-drop="${escapeHtml(m.id)}">${m.dropped ? "Restore" : "Drop"}</button>
            </li>`;
          })
          .join("")}
      </ul>
      <button type="button" class="btn btn--primary" id="to-resolve">Continue to transcript</button>
    </section>
  `;

  root.querySelector("#offset")?.addEventListener("change", (e) => {
    session.recordingOffsetSec = Math.round(
      Number((e.target as HTMLInputElement).value),
    );
    props.onChange(session);
  });
  root.querySelectorAll("[data-drop]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.drop!;
      const m = session.marks.find((x) => x.id === id);
      if (m) m.dropped = !m.dropped;
      props.onChange(session);
    });
  });
  root.querySelectorAll("[data-assign]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const id = (sel as HTMLElement).dataset.assign!;
      const m = session.marks.find((x) => x.id === id);
      if (m) m.codeRef = (sel as HTMLSelectElement).value || null;
      props.onChange(session);
    });
  });
  root
    .querySelector("#to-resolve")
    ?.addEventListener("click", () => props.onContinue());
}
