import { parseSrt, parseVtt, parseTranscriptFile } from "./parse";

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

describe("parseTranscriptFile", () => {
  it("rejects txt", () => {
    expect(() => parseTranscriptFile("x.txt", "nope")).toThrow(/timestamps/);
  });
});
