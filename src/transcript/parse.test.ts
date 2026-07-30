import { readFileSync } from "fs";
import { join } from "path";
import {
  parseSrt,
  parseVtt,
  parseTxt,
  parseSpeakerTurns,
  parseNumberedSegments,
  parseTranscriptFile,
  detectPdfFamily,
} from "./parse";

const fixtures = join(__dirname, "fixtures");

describe("parseSrt", () => {
  it("parses numbered segments", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,500
First line

2
00:00:03,000 --> 00:00:04,000
Second line
`;
    const lines = parseSrt(srt);
    expect(lines).toHaveLength(2);
    expect(lines[0].n).toBe(1);
    expect(lines[0].startMs).toBe(1000);
    expect(lines[0].text).toBe("First line");
  });

  it("strips italic tags from SRT cues", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
<i>Hello</i> ﬁeld

`;
    expect(parseSrt(srt)[0].text).toBe("Hello field");
  });
});

describe("parseVtt", () => {
  it("strips WEBVTT header", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:02.000
Hi
`;
    expect(parseVtt(vtt)[0].text).toBe("Hi");
  });
});

describe("parseSpeakerTurns", () => {
  it("keeps I/P speakers and MM:SS times", () => {
    const turns = parseSpeakerTurns(
      readFileSync(join(fixtures, "sample-turns.txt"), "utf8"),
    );
    expect(turns).toHaveLength(3);
    expect(turns[0].speaker).toBe("I");
    expect(turns[0].startMs).toBe(0);
    expect(turns[1].speaker).toBe("P");
    expect(turns[1].startMs).toBe(22_000);
  });
});

describe("parseNumberedSegments", () => {
  it("handles spaced and glued timestamps", () => {
    const turns = parseNumberedSegments(
      readFileSync(join(fixtures, "sample-numbered.txt"), "utf8"),
    );
    expect(turns).toHaveLength(3);
    expect(turns[0].speaker).toBeNull();
    expect(turns[0].startMs).toBe(1000);
    expect(turns[2].startMs).toBe(17 * 60_000 + 51_000);
    expect(turns[2].text).toContain("three years");
  });
});

describe("parseTxt", () => {
  it("returns paragraphs without times or speakers", () => {
    const turns = parseTxt(
      readFileSync(join(fixtures, "sample-prose.txt"), "utf8"),
    );
    expect(turns.length).toBeGreaterThanOrEqual(2);
    expect(turns[0].startMs).toBeNull();
    expect(turns[0].speaker).toBeNull();
  });
});

describe("detectPdfFamily", () => {
  it("detects speaker vs numbered", () => {
    expect(detectPdfFamily("[00:00] I: Hello")).toBe("speaker");
    expect(detectPdfFamily("1 00:00:01 Hello")).toBe("numbered");
  });
});

describe("parseTranscriptFile", () => {
  it("rejects txt without timestamps for line alignment", () => {
    expect(() => parseTranscriptFile("x.txt", "nope")).toThrow(/timestamps/);
  });
});
