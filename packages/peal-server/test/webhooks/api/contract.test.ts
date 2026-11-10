import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { Duration, Schema } from "effect";
import {
  FailureReasonSchema,
  maxWebhookAttempts,
  maxWebhookDescriptionLength,
  maxWebhookEndpoints,
  maxWebhookUrlLength,
  MediaFailureReasonSchema,
  SubscribableWebhookEventTypeSchema,
  UnconfirmedReasonSchema,
  WebhookAttemptErrorSchema,
  WebhookDeliveryFailureSchema,
  webhookDeliveryRetentionDays,
  WebhookDisabledReasonSchema,
  WebhookEventTypeSchema,
  webhookEventVersion,
  webhookFailingDays,
  WebhookPayloadSchema,
  webhookSecretOverlapHours,
} from "peal-contract";

import {
  ProbeStateSchema,
  RejectionReasonSchema,
} from "#media/domain/media-status.ts";
import { FailureReasonSchema as DomainFailureReasonSchema } from "#publishing/domain/post-target-status.ts";
import { UnconfirmedReasonSchema as DomainUnconfirmedReasonSchema } from "#shared/domain/publish-result.ts";
import { AttemptOutcomeSchema } from "#webhooks/domain/delivery-attempt.ts";
import {
  deliveryRetention,
  maxAttempts,
  maxEndpointsPerWorkspace,
  secretOverlap,
  turnOffAfterFailingFor,
} from "#webhooks/domain/delivery-policy.ts";
import { DeliveryFailureSchema } from "#webhooks/domain/webhook-delivery.ts";
import {
  DisabledReasonSchema,
  maxDescriptionLength,
} from "#webhooks/domain/webhook-endpoint.ts";
import {
  SubscribableEventTypeSchema,
  WebhookEventTypeSchema as DomainEventTypeSchema,
} from "#webhooks/domain/webhook-event-type.ts";
import {
  eventVersion,
  WebhookEventSchema,
} from "#webhooks/domain/webhook-event.ts";
import { maxWebhookUrlLength as domainMaxUrlLength } from "#webhooks/domain/webhook-url.ts";

// Receivers, the SDKs, the web app and the docs read the contract's copy of
// the webhooks' vocabulary and rules. These keep it equal to the server's.

const docs = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "peal-docs",
  "docs"
);

const example = /^```json title="(?<type>[^"]+)"\n(?<body>[\s\S]*?)\n```$/gmu;

const decodePayload = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(WebhookPayloadSchema)),
  { onExcessProperty: "error" }
);

const decodeEvent = Schema.decodeUnknownSync(
  Schema.toCodecJson(WebhookEventSchema),
  { onExcessProperty: "error" }
);

describe("the contract", () => {
  it("lists the events, and their version, as the server sends them", () => {
    expect(WebhookEventTypeSchema.literals).toStrictEqual(
      DomainEventTypeSchema.literals
    );
    expect(SubscribableWebhookEventTypeSchema.literals).toStrictEqual(
      SubscribableEventTypeSchema.literals
    );
    expect(webhookEventVersion).toBe(eventVersion);
    expect(
      WebhookPayloadSchema.members.map((member) => member.fields.type.literal)
    ).toStrictEqual(
      WebhookEventSchema.members.map((member) => member.fields.type.literal)
    );
  });

  it("names the reasons events carry as the contexts that give them do", () => {
    expect(FailureReasonSchema.literals.toSorted()).toStrictEqual(
      DomainFailureReasonSchema.literals.toSorted()
    );
    expect(UnconfirmedReasonSchema.literals.toSorted()).toStrictEqual(
      DomainUnconfirmedReasonSchema.literals.toSorted()
    );
    // What media.failed says: a refusal, or a probe that did not read the
    // file (never `pending`, which is not an end).
    expect(MediaFailureReasonSchema.literals.toSorted()).toStrictEqual(
      [
        ...RejectionReasonSchema.literals,
        ...ProbeStateSchema.literals.filter((state) => state !== "pending"),
      ].toSorted()
    );
  });

  it("states the limits and delays the server applies", () => {
    expect({
      attempts: maxWebhookAttempts,
      description: maxWebhookDescriptionLength,
      endpoints: maxWebhookEndpoints,
      failingDays: webhookFailingDays,
      overlapHours: webhookSecretOverlapHours,
      retentionDays: webhookDeliveryRetentionDays,
      url: maxWebhookUrlLength,
    }).toStrictEqual({
      attempts: maxAttempts,
      description: maxDescriptionLength,
      endpoints: maxEndpointsPerWorkspace,
      failingDays: Duration.toDays(turnOffAfterFailingFor),
      overlapHours: Duration.toHours(secretOverlap),
      retentionDays: Duration.toDays(deliveryRetention),
      url: domainMaxUrlLength,
    });
  });

  it("names how endpoints and deliveries end as the server does", () => {
    expect(WebhookDisabledReasonSchema.literals).toStrictEqual(
      DisabledReasonSchema.literals
    );
    expect(WebhookDeliveryFailureSchema.literals).toStrictEqual(
      DeliveryFailureSchema.literals
    );
    expect(WebhookAttemptErrorSchema.literals).toStrictEqual(
      AttemptOutcomeSchema.members[1].fields.reason.literals
    );
  });
});

describe.each(["webhooks.mdx", "fr/webhooks.mdx"])(
  "the examples of the docs' %s",
  (page) => {
    it("are payloads the server sends, one for every event type", async () => {
      const text = await readFile(path.join(docs, page), "utf-8");

      const examples = [...text.matchAll(example)].map(({ groups }) => ({
        body: groups?.["body"] ?? "",
        type: groups?.["type"] ?? "",
      }));

      expect(examples.map(({ type }) => type).toSorted()).toStrictEqual(
        DomainEventTypeSchema.literals.toSorted()
      );

      for (const { body, type } of examples) {
        const payload = decodePayload(body);

        expect(payload.type).toBe(type);
        // What the server could have stored for it, too.
        expect(
          decodeEvent({
            data: Schema.decodeUnknownSync(
              Schema.Struct({ data: Schema.Json })
            )(JSON.parse(body)).data,
            type,
          }).type
        ).toBe(type);
      }
    });
  }
);
