import { describe, expect, it } from "@effect/vitest";

import { sampleCsv } from "#posts/import-sample.ts";

describe(sampleCsv, () => {
  it("writes three rows next year on a placeholder channel", () => {
    expect(
      sampleCsv({
        texts: ["First note", "Second note", "Third note"],
        timeZone: "Europe/Paris",
        year: 2026,
      })
    ).toBe(
      [
        "text,channels,at,time_zone",
        "First note,CHANNEL_ID,2027-01-05 09:00,Europe/Paris",
        "Second note,CHANNEL_ID,2027-01-12 09:00,Europe/Paris",
        "Third note,CHANNEL_ID,2027-01-19 09:00,Europe/Paris",
        "",
      ].join("\r\n")
    );
  });

  it("quotes a text that holds a comma or a quote", () => {
    expect(
      sampleCsv({
        texts: ["Salut, la foire", 'Le "grand" jour', "Merci"],
        timeZone: "UTC",
        year: 2026,
      })
        .split("\r\n")
        .slice(1, 3)
    ).toStrictEqual([
      '"Salut, la foire",CHANNEL_ID,2027-01-05 09:00,UTC',
      '"Le ""grand"" jour",CHANNEL_ID,2027-01-12 09:00,UTC',
    ]);
  });
});
