import { describe, it, expect } from "vitest";
import {
  normalizePdfText,
  normalizeTranscriptText,
} from "./normalize-transcript-text";

describe("normalizeTranscriptText", () => {
  it("repairs PDF ligature mis-maps", () => {
    expect(normalizePdfText("parƟcipant aŌerwards beƩer")).toBe(
      "participant afterwards better",
    );
    expect(normalizeTranscriptText("cuƫng")).toBe("cutting");
  });

  it("expands Unicode presentation ligatures and absorbs spurious spaces", () => {
    expect(normalizeTranscriptText("ﬁeld ﬂow eﬃcient")).toBe(
      "field flow efficient",
    );
    expect(normalizeTranscriptText("ﬁ eld")).toBe("field");
  });

  it("strips soft hyphens, zero-width, BOM, and replacement chars", () => {
    expect(normalizeTranscriptText("par\u00ADticipant\u200B")).toBe(
      "participant",
    );
    expect(normalizeTranscriptText("\uFEFFhello\uFFFD")).toBe("hello");
  });

  it("strips null/control chars that become boxes in Word", () => {
    expect(normalizeTranscriptText("veri\u0000fies")).toBe("verifies");
    expect(normalizeTranscriptText("a\u0007b\u007Fc")).toBe("abc");
  });

  it("strips private-use glyphs from broken PDF fonts", () => {
    expect(normalizeTranscriptText("hello\uE000world")).toBe("helloworld");
  });

  it("strips SRT/VTT tags and decodes entities", () => {
    expect(normalizeTranscriptText("<i>Hello</i> &nbsp; there")).toBe(
      "Hello there",
    );
    expect(normalizeTranscriptText('{\\an8}<c.white>Hi</c>')).toBe("Hi");
    expect(normalizeTranscriptText("&amp; &lt;ok&gt;")).toBe("& <ok>");
  });

  it("collapses leftover whitespace", () => {
    expect(normalizeTranscriptText("  too   spaced  ")).toBe("too spaced");
  });
});
