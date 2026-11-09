import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { DeliverNoticeV1 } from "#notifications/infrastructure/workflows/deliver-notice.ts";

// Every DeliverNoticeV1 history ever stored must still decode with the
// current code, and its execution id must come out the same from its
// payload: changed, an event's emails started again after a deploy would
// get a second execution. Keep the fixtures when the schemas change, and add
// new ones beside them.

const fixtures = path.join(
  import.meta.dirname,
  "fixtures",
  "persisted",
  "DeliverNoticeV1"
);

// Reads a fixture as the JSON it is and decodes it with `schema`.
const fixture = <S extends Schema.Top>(name: string, schema: S) =>
  Effect.promise(
    async () => await readFile(path.join(fixtures, name), "utf-8")
  ).pipe(
    Effect.flatMap(
      Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.toCodecJson(schema))
      )
    )
  );

const KeysSchema = Schema.Struct({ executionId: Schema.String });

describe("the persisted contract of DeliverNoticeV1", () => {
  it("keeps its tag", () => {
    assert.strictEqual(DeliverNoticeV1._tag, "DeliverNoticeV1");
  });

  it.effect("decodes its payloads, and derives the same execution ids", () =>
    Effect.gen(function* derivesTheSameIds() {
      const payload = yield* fixture(
        "payload.json",
        DeliverNoticeV1.payloadSchema
      );

      const keys = yield* fixture("keys.json", KeysSchema);

      assert.strictEqual(
        yield* DeliverNoticeV1.executionId(payload),
        keys.executionId
      );
    })
  );
});
