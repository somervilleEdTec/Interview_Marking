import type { Code, Session } from "../model/types";

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
      <p class="lede">This session: <strong>${kept}</strong> marks · running average: <strong>${props.averageMarks.toFixed(1)}</strong></p>
      <label class="field">Global recording offset (seconds)
        <input id="offset" type="number" step="0.1" value="${session.recordingOffsetSec}" />
      </label>
      <ul class="mark-list">
        ${session.marks
          .map((m, idx) => {
            const time = new Date(m.at).toLocaleTimeString();
            return `<li class="${m.dropped ? "dropped" : ""}" data-id="${m.id}">
              <span class="mono">${time}</span>
              <span class="chip">${m.slot}</span>
              <span>${m.codeRef ?? (m.slot === "nofit" ? "nofit" : "general")}</span>
              ${
                m.slot === "general" && !m.codeRef
                  ? `<select data-assign="${m.id}">
                      <option value="">Assign code…</option>
                      ${props.codes.map((c) => `<option value="${c.sheetName}">${c.sheetName}</option>`).join("")}
                    </select>`
                  : ""
              }
              <input data-note="${m.id}" placeholder="Note" value="${m.note.replace(/"/g, "&quot;")}" />
              <button type="button" data-drop="${m.id}">${m.dropped ? "Restore" : "Drop"}</button>
              ${idx > 0 ? `<button type="button" data-merge="${m.id}">Merge←prev</button>` : ""}
            </li>`;
          })
          .join("")}
      </ul>
      <button type="button" class="btn btn--primary" id="to-resolve">Continue to transcript</button>
    </section>
  `;

  root.querySelector("#offset")?.addEventListener("change", (e) => {
    session.recordingOffsetSec = Number((e.target as HTMLInputElement).value);
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
  root.querySelectorAll("[data-note]").forEach((inp) => {
    inp.addEventListener("change", () => {
      const id = (inp as HTMLElement).dataset.note!;
      const m = session.marks.find((x) => x.id === id);
      if (m) m.note = (inp as HTMLInputElement).value;
      props.onChange(session);
    });
  });
  root.querySelectorAll("[data-merge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.merge!;
      const i = session.marks.findIndex((x) => x.id === id);
      if (i <= 0) return;
      const prev = session.marks[i - 1];
      const cur = session.marks[i];
      cur.codeRef = prev.codeRef;
      cur.slot = prev.slot;
      props.onChange(session);
    });
  });
  root
    .querySelector("#to-resolve")
    ?.addEventListener("click", () => props.onContinue());
}
