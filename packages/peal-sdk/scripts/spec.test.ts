import { describe, expect, it } from "bun:test";
import path from "node:path";

import { Schema } from "effect";

// The SDKs' document, which `nx run peal-sdk:spec` writes before these
// tests, beside the contract's it comes from.
const read = async (file: string) =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Schema.JsonObject))(
    await Bun.file(file).text()
  );

const root = path.join(import.meta.dirname, "..", "..");

describe("the SDKs' document", () => {
  it("leaves out the events webhooks send, which the contract's lists", async () => {
    const contract = await read(
      path.join(root, "peal-contract", "openapi.json")
    );

    const sdks = await read(path.join(root, "peal-sdk", "openapi.json"));

    expect(Object.keys(contract)).toContain("webhooks");
    expect(Object.keys(sdks)).not.toContain("webhooks");
  });
});
