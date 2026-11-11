import { HttpApi, OpenApi } from "effect/http-api";

import { Api } from "./api.ts";
import { WebhookPayloadSchema } from "./webhook-events.ts";
import type { WebhookEventType } from "./webhook-events.ts";

// The API's OpenAPI document, with the events Peal sends to webhook
// endpoints in its `webhooks` section (OpenAPI 3.1): one entry per event
// type, whose request body is that type's payload, a component like any
// other. The contract's script writes it for the docs, and the server
// serves the same at /api/openapi.json.

/** What each event tells, as the docs' table of events says it. */
const summaries = {
  "boost.budget_reached": "A boost spent its whole total budget",
  "boost.ended": "A boost's end date passed",
  "boost.failed": "A boost could not be made, and nothing ran",
  "boost.paused": "A member paused a boost",
  "boost.resumed": "A member ran a paused boost again",
  "boost.started": "A boost was made and turned on",
  "boost.stopped": "A member stopped a boost for good",
  "boost.unconfirmed": "Peal cannot tell whether a boost runs",
  "channel.connected":
    "An account was connected, or a channel authorized again",
  "channel.disabled": "A member turned a channel off",
  "channel.disconnected": "A channel was disconnected",
  "channel.enabled": "A member turned a channel back on",
  "channel.expiring":
    "A channel's authorization ends soon, and cannot be renewed",
  "channel.reconnect_needed": "A channel's authorization stopped working",
  "comment.received": "Someone commented under a post that went live",
  "comment.replied": "A reply to a comment went out from Peal",
  "media.failed": "A file was refused, or could not be read",
  "media.ready": "A file was read, and can go in posts",
  "post.approval_requested": "A post waits for an approval",
  "post.approved": "A post that waited was approved",
  "post.cancelled": "A post was cancelled",
  "post.changes_requested": "Changes were asked for on a post that waited",
  "post.failed": "A post did not go out on a channel",
  "post.finished": "Every channel of a post has its result",
  "post.published": "A post went live on a channel",
  "post.scheduled": "A post was scheduled, or moved to another time",
  "post.unconfirmed": "Peal cannot tell whether a post went live on a channel",
  "post.unscheduled":
    "A scheduled post, or one that waited, was taken back to draft",
  "webhook.test": "Someone asked for a test event",
} satisfies { readonly [Type in WebhookEventType]: string };

// `post.finished` as `PostFinished`.
const pascalCase = (type: string): string =>
  type
    .split(/[._]/u)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join("");

/** The component that names an event type's payload. */
export const webhookPayloadComponent = (type: WebhookEventType): string =>
  `Webhook${pascalCase(type)}Payload`;

/** The operation that names an event type's request, as generators need one. */
export const webhookOperationId = (type: WebhookEventType): string =>
  `on${pascalCase(type)}`;

const payloads = WebhookPayloadSchema.members.map((member) => {
  const type = member.fields.type.literal;

  return {
    schema: member.annotate({
      description: `The body of a \`${type}\` webhook request.`,
      identifier: webhookPayloadComponent(type),
    }),
    type,
  };
});

// The Standard Webhooks headers every request carries.
const parameters = [
  {
    description:
      "The event's id: the same on every delivery of the event, so a receiver deduplicates on it.",
    in: "header",
    name: "webhook-id",
    required: true,
    schema: { type: "string" },
  },
  {
    description:
      "When the attempt was made, in seconds since the Unix epoch: refuse one too far from now.",
    in: "header",
    name: "webhook-timestamp",
    required: true,
    schema: { type: "string" },
  },
  {
    description:
      "One `v1,<base64 HMAC-SHA256>` per signing secret, separated by spaces, over `<webhook-id>.<webhook-timestamp>.<body>`.",
    in: "header",
    name: "webhook-signature",
    required: true,
    schema: { type: "string" },
  },
] as const;

/** One webhook's request, as the OpenAPI document describes it. */
export interface WebhookOperation {
  readonly description: string;
  readonly operationId: string;
  readonly parameters: typeof parameters;
  readonly requestBody: {
    readonly content: {
      readonly "application/json": {
        readonly schema: { readonly $ref: string };
      };
    };
    readonly required: true;
  };
  readonly responses: {
    readonly "2XX": { readonly description: string };
  };
  readonly summary: string;
}

/** The API's document, with the events Peal sends. */
export type PealOpenApiDocument = OpenApi.OpenAPISpec & {
  // By event type.
  readonly webhooks: Readonly<
    Record<string, { readonly post: WebhookOperation }>
  >;
};

/** The webhooks section: one entry per event type, `webhook.test` included. */
const webhooks = (): PealOpenApiDocument["webhooks"] => {
  const entries = payloads.map(({ type }) => {
    const post: WebhookOperation = {
      description: `Peal sends this to the endpoints that subscribe to \`${type}\`, signed as the Standard Webhooks specification says. Answer any 2xx once it is taken; any other answer, or none within 15 seconds, is tried again.`,
      operationId: webhookOperationId(type),
      parameters,
      requestBody: {
        content: {
          "application/json": {
            schema: {
              $ref: `#/components/schemas/${webhookPayloadComponent(type)}`,
            },
          },
        },
        required: true,
      },
      responses: {
        "2XX": { description: "The receiver took the event." },
      },
      summary: summaries[type],
    };

    return [type, { post }] as const;
  });

  return Object.fromEntries(entries);
};

/**
 * The OpenAPI 3.1 document of the API and of the events it sends: what the
 * contract writes to `openapi.json` and the server serves.
 */
export const openApiDocument = (): PealOpenApiDocument => ({
  ...OpenApi.fromApi(
    Api.annotate(
      HttpApi.AdditionalSchemas,
      payloads.map(({ schema }) => schema)
    )
  ),
  webhooks: webhooks(),
});
