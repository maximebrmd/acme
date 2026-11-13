import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Schema } from "effect";
import {
  FailureReasonSchema,
  maxWebhookAttempts,
  maxWebhookBulkRedelivery,
  maxWebhookFilterChannels,
  maxWebhookFilterWorkspaces,
  maxWebhookHeaderNameLength,
  maxWebhookHeaders,
  maxWebhookHeaderValueLength,
  NewWebhookEndpointSchema,
  refusedWebhookHeaderNames,
  refusedWebhookHeaderPrefixes,
  webhookBulkRedeliveriesPerHour,
  WebhookRedeliverySkipSchema,
  WebhookSettledTargetStatusSchema,
  maxWebhookDescriptionLength,
  maxWebhookEndpoints,
  webhookManualSendsPerHour,
  maxWebhookUrlLength,
  MediaFailureReasonSchema,
  PostOutcomeSchema,
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
import { PostOutcomeSchema as DomainPostOutcomeSchema } from "#publishing/domain/post-status.ts";
import {
  FailureReasonSchema as DomainFailureReasonSchema,
  PostTargetStatusNameSchema,
} from "#publishing/domain/post-target-status.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { UnconfirmedReasonSchema as DomainUnconfirmedReasonSchema } from "#shared/domain/publish-result.ts";
import type { SkipReason } from "#webhooks/application/webhook-deliveries.ts";
import { AttemptOutcomeSchema } from "#webhooks/domain/delivery-attempt.ts";
import {
  bulkRedeliveriesPerHour,
  deliveryRetention,
  maxAttempts,
  maxBulkRedelivery,
  maxFilterChannels,
  maxFilterWorkspaces,
  manualSendsPerHour,
  maxEndpointHeaders,
  maxEndpointsPerWorkspace,
  secretOverlap,
  turnOffAfterFailingFor,
} from "#webhooks/domain/delivery-policy.ts";
import {
  EndpointHeadersSchema,
  maxHeaderNameLength,
  maxHeaderValueLength,
  refusedHeaderNames,
  refusedHeaderPrefixes,
} from "#webhooks/domain/endpoint-headers.ts";
import { bodyOf, RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { sampleOf } from "#webhooks/domain/sample-events.ts";
import { DeliveryFailureSchema } from "#webhooks/domain/webhook-delivery.ts";
import {
  DisabledReasonSchema,
  maxDescriptionLength,
} from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import {
  SubscribableEventTypeSchema,
  WebhookEventTypeSchema as DomainEventTypeSchema,
} from "#webhooks/domain/webhook-event-type.ts";
import {
  eventVersion,
  FinishedOutcomeSchema,
  SettledTargetStatusSchema,
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

// The events pages, one per family, read as one text.
const eventsPages = async (folder: string) => {
  const files = await readdir(path.join(docs, folder));

  const texts = await Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .toSorted()
      .map(
        async (file) => await readFile(path.join(docs, folder, file), "utf-8")
      )
  );

  return texts.join("\n");
};

const example =
  /^```json title="(?!sample )(?<type>[^"]+)"\n(?<body>[\s\S]*?)\n```$/gmu;

const sampleExample =
  /^```json title="sample (?<type>[^"]+)"\n(?<body>[\s\S]*?)\n```$/gmu;

const decodePayload = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(WebhookPayloadSchema)),
  { onExcessProperty: "error" }
);

const decodeEvent = Schema.decodeUnknownSync(
  Schema.toCodecJson(WebhookEventSchema),
  { onExcessProperty: "error" }
);

const header = (name: string, value = "synthetic") => ({ name, value });

// Headers the contract and the endpoint must judge alike.
const headerCases = [
  [],
  [header("Authorization", "Bearer synthetic-token")],
  [header("webhook-id")],
  [header("Webhook-Signature")],
  [header("Host")],
  [header("Content-Encoding", "gzip")],
  [header("content-range", "bytes 0-1/2")],
  [header("Expect", "100-continue")],
  [header("Accept-Encoding", "identity")],
  [header("Contents-Version")],
  [header("Bad Name")],
  [header("X-Value", "line\nbreak")],
  [header("X-Value", " padded")],
  [header("X-Value", "nul\u0000")],
  [header("X-Value", "half \uD83D")],
  [header("X-Value", "")],
  [header("A"), header("a")],
  ["A", "B", "C", "D", "E", "F"].map((name) => header(name)),
  ["A", "B", "C", "D", "E"].map((name) => header(name)),
];

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

  it("names how post.finished says a post ended as publishing does", () => {
    // Once every target settled: never pending nor publishing.
    expect(FinishedOutcomeSchema.literals).toStrictEqual(
      DomainPostOutcomeSchema.literals
    );
    expect(PostOutcomeSchema.literals).toStrictEqual(
      DomainPostOutcomeSchema.literals
    );
    expect(SettledTargetStatusSchema.literals).toStrictEqual(
      PostTargetStatusNameSchema.literals.filter(
        (status) => status !== "pending" && status !== "publishing"
      )
    );
    expect(WebhookSettledTargetStatusSchema.literals).toStrictEqual(
      SettledTargetStatusSchema.literals
    );
  });

  it("states the limits and delays the server applies", () => {
    expect({
      attempts: maxWebhookAttempts,
      bulk: maxWebhookBulkRedelivery,
      bulkPerHour: webhookBulkRedeliveriesPerHour,
      channels: maxWebhookFilterChannels,
      description: maxWebhookDescriptionLength,
      endpoints: maxWebhookEndpoints,
      failingDays: webhookFailingDays,
      headerName: maxWebhookHeaderNameLength,
      headerValue: maxWebhookHeaderValueLength,
      headers: maxWebhookHeaders,
      manualSends: webhookManualSendsPerHour,
      overlapHours: webhookSecretOverlapHours,
      retentionDays: webhookDeliveryRetentionDays,
      url: maxWebhookUrlLength,
      workspaces: maxWebhookFilterWorkspaces,
    }).toStrictEqual({
      attempts: maxAttempts,
      bulk: maxBulkRedelivery,
      bulkPerHour: bulkRedeliveriesPerHour,
      channels: maxFilterChannels,
      description: maxDescriptionLength,
      endpoints: maxEndpointsPerWorkspace,
      failingDays: Duration.toDays(turnOffAfterFailingFor),
      headerName: maxHeaderNameLength,
      headerValue: maxHeaderValueLength,
      headers: maxEndpointHeaders,
      manualSends: manualSendsPerHour,
      overlapHours: Duration.toHours(secretOverlap),
      retentionDays: Duration.toDays(deliveryRetention),
      url: domainMaxUrlLength,
      workspaces: maxFilterWorkspaces,
    });
  });

  it("takes the headers an endpoint takes, and refuses those it refuses", () => {
    expect(refusedWebhookHeaderNames).toStrictEqual(refusedHeaderNames);
    expect(refusedWebhookHeaderPrefixes).toStrictEqual(refusedHeaderPrefixes);

    const disagreeing = headerCases.filter(
      (headers) =>
        Schema.is(NewWebhookEndpointSchema)({
          eventTypes: ["post.published"],
          headers,
          url: "https://hooks.example.com/peal",
        }) !== Schema.is(EndpointHeadersSchema)(headers)
    );

    expect(disagreeing).toStrictEqual([]);
  });

  it("names why a delivery is not sent again as the server does", () => {
    const reasons: readonly SkipReason[] = [
      "alreadySent",
      "endpointDisabled",
      "notFound",
    ];

    expect(WebhookRedeliverySkipSchema.literals).toStrictEqual(reasons);
  });

  it.each(SubscribableEventTypeSchema.literals)(
    "has a sample of %s that receivers read, marked as one",
    (type) => {
      const workspaceId = WorkspaceIdSchema.make(
        "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
      );

      const payload = decodePayload(
        bodyOf(
          new RecordedEvent({
            event: sampleOf(type, workspaceId),
            id: WebhookEventIdSchema.make(
              "00000000-0000-7000-8000-0000000000ff"
            ),
            occurredAt: DateTime.makeUnsafe("2026-01-01T09:00:00Z"),
            sample: true,
            workspaceId,
          })
        )
      );

      expect(payload.type).toBe(type);
      expect(payload.sample).toBeTruthy();
      expect(payload.data.workspaceId).toBe(workspaceId);
    }
  );

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

describe.each(["developers/webhooks/events", "fr/developers/webhooks/events"])(
  "the examples of the docs' %s",
  (page) => {
    it("are payloads the server sends, one for every event type", async () => {
      const text = await eventsPages(page);

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

describe.each(["developers/webhooks/events", "fr/developers/webhooks/events"])(
  "the sample of the docs' %s",
  (page) => {
    it("is a payload marked as a sample", async () => {
      const text = await eventsPages(page);
      const samples = [...text.matchAll(sampleExample)];

      expect(samples).toHaveLength(1);

      for (const { groups } of samples) {
        const payload = decodePayload(groups?.["body"] ?? "");

        expect(payload.type).toBe(groups?.["type"]);
        expect(payload.sample).toBeTruthy();
      }
    });
  }
);
