import { describe, expect, it } from "@effect/vitest";
import { DateTime, Schema } from "effect";

import {
  ErasureEntrySchema,
  erasureLedgerCutoff,
} from "#workspace/domain/erasure-ledger.ts";

describe("the erasure ledger", () => {
  it("keeps an entry 42 days, longer than backups hold deleted data", () => {
    expect(
      erasureLedgerCutoff(DateTime.makeUnsafe("2026-11-10T04:17:00Z"))
    ).toStrictEqual(DateTime.makeUnsafe("2026-09-29T04:17:00Z"));
  });

  // Entries are stored as JSON: what was written must keep decoding.
  it("reads an entry as it was first stored", () => {
    const stored =
      '{"at":"2026-11-10T09:00:00.000Z","confirmed":true,"id":"019a6f10-0000-7000-8000-000000000001","userId":null,"version":1,"workspaceIds":["5b1f0d6e-2f6b-4c57-9c06-3b7e7d0f2a11"]}';

    const entry = Schema.decodeUnknownSync(
      Schema.fromJsonString(ErasureEntrySchema)
    )(stored);

    expect(entry.at).toStrictEqual(DateTime.makeUnsafe("2026-11-10T09:00:00Z"));
    expect(entry.workspaceIds).toStrictEqual([
      "5b1f0d6e-2f6b-4c57-9c06-3b7e7d0f2a11",
    ]);
    // Ids and the time, and nothing that names anyone.
    expect(Object.keys(entry).toSorted()).toStrictEqual([
      "at",
      "confirmed",
      "id",
      "userId",
      "version",
      "workspaceIds",
    ]);
  });
});
