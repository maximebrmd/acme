// The events Peal sends, as the OpenAPI document describes them in its
// `webhooks` section: one entry per event type, each naming its payload, a
// component of the document, and the Standard Webhooks headers.
import { describe, expect, it } from "@effect/vitest";
import { DateTime, Schema } from "effect";
import {
  SubscribableWebhookEventTypeSchema,
  WebhookEventTypeSchema,
  WebhookPayloadSchema,
} from "peal-contract";
import {
  openApiDocument,
  webhookOperationId,
  webhookPayloadComponent,
} from "peal-contract/openapi-document";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { bodyOf, RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { sampleOf } from "#webhooks/domain/sample-events.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";

const document = openApiDocument();

const ComponentSchema = Schema.Struct({
  properties: Schema.Struct({
    type: Schema.Struct({ enum: Schema.Tuple([Schema.String]) }),
  }),
});

const workspaceId = WorkspaceIdSchema.make(
  "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
);

const sampleBody = (
  type: typeof SubscribableWebhookEventTypeSchema.Type
): Schema.Json =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Json))(
    bodyOf(
      new RecordedEvent({
        event: sampleOf(type, workspaceId),
        id: WebhookEventIdSchema.make("00000000-0000-7000-8000-0000000000ff"),
        occurredAt: DateTime.makeUnsafe("2026-01-01T09:00:00Z"),
        sample: true,
        workspaceId,
      })
    )
  );

describe("the OpenAPI document's webhooks", () => {
  it("list every event type, the test event included, and nothing else", () => {
    expect(Object.keys(document.webhooks).toSorted()).toStrictEqual(
      [
        ...SubscribableWebhookEventTypeSchema.literals,
        "webhook.test",
      ].toSorted()
    );
    expect(Object.keys(document.webhooks).toSorted()).toStrictEqual(
      [...WebhookEventTypeSchema.literals].toSorted()
    );
  });

  it.each(WebhookEventTypeSchema.literals)(
    "describe %s with its operation, its headers and its payload's component",
    (type) => {
      const entry = document.webhooks[type];
      const component = webhookPayloadComponent(type);

      expect(entry?.post.operationId).toBe(webhookOperationId(type));
      expect(entry?.post.parameters.map(({ name }) => name)).toStrictEqual([
        "webhook-id",
        "webhook-timestamp",
        "webhook-signature",
      ]);
      expect(
        entry?.post.requestBody.content["application/json"].schema.$ref
      ).toBe(`#/components/schemas/${component}`);
      expect(
        Schema.decodeUnknownSync(ComponentSchema)(
          document.components.schemas[component]
        ).properties.type.enum
      ).toStrictEqual([type]);
    }
  );

  it("names every operation once", () => {
    const ids = Object.values(document.webhooks).map(
      ({ post }) => post.operationId
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SubscribableWebhookEventTypeSchema.literals)(
    "describe %s with the payload its sample is",
    (type) => {
      const member = WebhookPayloadSchema.members.find(
        (candidate) => candidate.fields.type.literal === type
      );

      expect(member).toBeDefined();

      // The member its component was written from reads the sample.
      const decoded =
        member === undefined
          ? undefined
          : Schema.decodeUnknownSync(Schema.toCodecJson(member), {
              onExcessProperty: "error",
            })(sampleBody(type));

      expect(decoded?.type).toBe(type);
    }
  );
});
