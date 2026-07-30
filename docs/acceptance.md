# Acceptance checklist (brief §10)

| #   | Criterion                                        | How verified                                                                            |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | 60-minute eyes-free marking, correct counts      | Manual Phase 0 + marking screen; unit map of home-row keys (`tests/acceptance.test.ts`) |
| 2   | Crash loses no prior marks                       | JSON store write on every mark (`src/storage/store.ts` `appendMark`)                    |
| 3   | SRT → numbered docx; marks resolve to line range | `parseSrt` + `resolveMarkLines` tests; `writeNumberedDocx`                              |
| 4   | Append only + backup                             | `workbook.test.ts` backup + append; refuses new sheets                                  |
| 5   | Excel lock → clear message, no partial write     | `assertWritable` throws before append                                                   |
| 6   | No mic/camera/screen-capture permission          | `npm run check:av` in CI                                                                |

Secondary: saturation events in store; codebook CSV export (`tests/secondary.test.ts`).
