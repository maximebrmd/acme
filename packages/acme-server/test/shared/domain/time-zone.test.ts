import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Schema } from "effect";

import { TimeZoneIdSchema, timeZoneOf } from "#shared/domain/time-zone.ts";

const decode = Schema.decodeUnknownOption(TimeZoneIdSchema);

describe("time zone ids", () => {
  it.each([
    "Europe/Paris",
    "America/New_York",
    "America/Port-au-Prince",
    "UTC",
    "Etc/GMT+1",
  ])("accepts %s", (id) => {
    expect(Schema.is(TimeZoneIdSchema)(id)).toBeTruthy();
  });

  it.each([
    { id: "+01:00", label: "an offset" },
    { id: "-05:00", label: "a negative offset" },
    // Node's Intl accepts this one; Bun's does not.
    { id: "\u221201:00", label: "an offset with a Unicode minus" },
    { id: "europe/paris", label: "a zone in lower case" },
    { id: "EUROPE/PARIS", label: "a zone in upper case" },
    { id: "utc", label: "UTC in lower case" },
    { id: "Europe/Paris/", label: "a trailing slash" },
    { id: " Europe/Paris", label: "a leading space" },
    { id: "Mars/Olympus_Mons", label: "an unknown zone" },
    { id: "", label: "an empty string" },
  ])("rejects $label", ({ id }) => {
    expect(Schema.is(TimeZoneIdSchema)(id)).toBeFalsy();
  });

  // Node's Intl turns "Asia/Kolkata" into "Asia/Calcutta"; Bun keeps it.
  it("keeps an alias as written, whatever the engine prefers", () => {
    expect(decode("Asia/Kolkata")).toStrictEqual(Option.some("Asia/Kolkata"));
  });
});

describe(timeZoneOf, () => {
  it("names the zone for date arithmetic", () => {
    const zone = timeZoneOf(TimeZoneIdSchema.make("Europe/Paris"));

    expect(DateTime.zoneToString(zone)).toBe("Europe/Paris");
  });
});
