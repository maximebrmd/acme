import { readFile } from "node:fs/promises";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Schema } from "effect";
import { WebhookPayloadSchema } from "peal-contract";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { bodyOf, RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { WebhookEventTypeSchema } from "#webhooks/domain/webhook-event-type.ts";
import { WebhookEventSchema } from "#webhooks/domain/webhook-event.ts";
import {
  AttemptResultSchema,
  DeliverWebhookV1,
} from "#webhooks/infrastructure/workflows/deliver-webhook.ts";

// Every DeliverWebhookV1 history ever stored must still decode with the
// current code, and its execution id must come out the same from its
// payload: changed, a delivery started again after a deploy would get a
// second execution. Every event ever stored (`webhooks.events`) must still
// decode too, and still be what receivers were promised. Keep the fixtures
// when the schemas change, and add new ones beside them.

const fixtures = path.join(import.meta.dirname, "fixtures", "persisted");

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

describe("the persisted contract of DeliverWebhookV1", () => {
  it("keeps its tag, and how its attempts end", () => {
    assert.strictEqual(DeliverWebhookV1._tag, "DeliverWebhookV1");
    assert.deepStrictEqual(AttemptResultSchema.literals, [
      "retry",
      "settled",
      "unrecorded",
    ]);
  });

  it.effect("decodes its payloads, and derives the same execution ids", () =>
    Effect.gen(function* derivesTheSameIds() {
      const payload = yield* fixture(
        "DeliverWebhookV1/payload.json",
        DeliverWebhookV1.payloadSchema
      );

      const keys = yield* fixture("DeliverWebhookV1/keys.json", KeysSchema);

      assert.strictEqual(
        yield* DeliverWebhookV1.executionId(payload),
        keys.executionId
      );
    })
  );
});

describe("the stored webhook events", () => {
  it.effect("still decode, one of every type, as receivers were promised", () =>
    Effect.gen(function* decodes() {
      const stored = yield* fixture(
        "events/stored.json",
        Schema.Array(WebhookEventSchema)
      );

      assert.deepStrictEqual(
        stored.map(({ type }) => type).toSorted(),
        WebhookEventTypeSchema.literals.toSorted()
      );

      // Each one's body is a payload of the public contract.
      const decodePayload = Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.toCodecJson(WebhookPayloadSchema))
      );

      const payloads = yield* Effect.all(
        stored.map((event) =>
          decodePayload(
            bodyOf(
              new RecordedEvent({
                event,
                id: WebhookEventIdSchema.make(
                  "019a6f3e-7b10-7c3a-9d41-5e2f8a6b4c09"
                ),
                occurredAt: DateTime.makeUnsafe("2026-11-12T08:00:03Z"),
                workspaceId: WorkspaceIdSchema.make(event.data.workspaceId),
              })
            )
          )
        )
      );

      assert.deepStrictEqual(
        payloads.map(({ type }) => type),
        stored.map(({ type }) => type)
      );
    })
  );
});
