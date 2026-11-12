import { readFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { capabilitiesOf } from "#publishing/domain/platform-capabilities.ts";
import { platforms } from "#shared/domain/platform.ts";

// What every platform without post formats was described as before they
// came (Instagram's and Facebook's stories and reels): formats are added
// to those two only, so the others' descriptions stay as they were. Run
// with UPDATE_CAPABILITIES=1 to write it again, only for a change meant
// for these platforms.
const snapshot = new URL(
  "fixtures/capabilities-without-formats.json",
  import.meta.url
);

const withFormats = new Set(["facebook", "instagram"]);

const decodeJson = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Json));

const current = decodeJson(
  JSON.stringify(
    platforms
      .filter((platform) => !withFormats.has(platform))
      .map((platform) => capabilitiesOf(platform, true))
  )
);

describe("the capabilities of platforms without post formats", () => {
  it("stay as they were described before formats", () => {
    if (process.env["UPDATE_CAPABILITIES"] === "1") {
      writeFileSync(snapshot, `${JSON.stringify(current, null, 2)}\n`);
    }

    expect(current).toStrictEqual(decodeJson(readFileSync(snapshot, "utf-8")));
  });
});
