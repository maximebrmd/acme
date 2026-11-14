import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  SendReplyV1,
  SendResultSchema,
} from "#engagement/infrastructure/workflows/send-reply.ts";
import {
  ReviewSendResultSchema,
  SendReviewReplyV1,
} from "#engagement/infrastructure/workflows/send-review-reply.ts";

// Every SendReplyV1 history ever stored must still decode with the current
// code, and its execution id must come out the same from its payload:
// changed, a reply started again after a deploy would get a second
// execution, and could be sent twice. Keep the fixtures when the schemas
// change, and add new ones beside them.

const fixtures = path.join(import.meta.dirname, "fixtures", "persisted");

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

describe("the persisted contract of SendReplyV1", () => {
  it("keeps its tag, and how a run leaves its reply", () => {
    assert.strictEqual(SendReplyV1._tag, "SendReplyV1");
    assert.deepStrictEqual(SendResultSchema.literals, [
      "settled",
      "superseded",
      "unrecorded",
    ]);
  });

  it.effect("decodes its payloads, and derives the same execution ids", () =>
    Effect.gen(function* derivesTheSameIds() {
      const payload = yield* fixture(
        "SendReplyV1/payload.json",
        SendReplyV1.payloadSchema
      );

      const keys = yield* fixture("SendReplyV1/keys.json", KeysSchema);

      assert.strictEqual(
        yield* SendReplyV1.executionId(payload),
        keys.executionId
      );
    })
  );
});

describe("the persisted contract of SendReviewReplyV1", () => {
  it("keeps its tag, and how a run leaves its reply", () => {
    assert.strictEqual(SendReviewReplyV1._tag, "SendReviewReplyV1");
    assert.deepStrictEqual(ReviewSendResultSchema.literals, [
      "settled",
      "superseded",
      "unrecorded",
    ]);
  });

  it.effect("decodes its payloads, and derives the same execution ids", () =>
    Effect.gen(function* derivesTheSameIds() {
      const payload = yield* fixture(
        "SendReviewReplyV1/payload.json",
        SendReviewReplyV1.payloadSchema
      );

      const keys = yield* fixture("SendReviewReplyV1/keys.json", KeysSchema);

      assert.strictEqual(
        yield* SendReviewReplyV1.executionId(payload),
        keys.executionId
      );
    })
  );
});
