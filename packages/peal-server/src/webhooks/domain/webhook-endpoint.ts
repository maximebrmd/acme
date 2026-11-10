import { DateTime, Duration, Effect, Option, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { secretOverlap, turnOffAfterFailingFor } from "./delivery-policy.ts";
import { WebhookEndpointIdSchema } from "./webhook-endpoint-id.ts";
import type { WebhookEndpointId } from "./webhook-endpoint-id.ts";
import { SubscribableEventTypeSchema } from "./webhook-event-type.ts";
import type {
  SubscribableEventType,
  WebhookEventType,
} from "./webhook-event-type.ts";
import { WebhookUrlSchema } from "./webhook-url.ts";
import type { WebhookUrl } from "./webhook-url.ts";

export const maxDescriptionLength = 200;

/** What a member says an endpoint is for. May be empty. */
export const EndpointDescriptionSchema = Schema.String.check(
  Schema.isMaxLength(maxDescriptionLength)
);

/** The events an endpoint hears about: one type at least, each once. */
export const EventTypesSchema = Schema.NonEmptyArray(
  SubscribableEventTypeSchema
);

export type EventTypes = typeof EventTypesSchema.Type;

/**
 * Why an endpoint is off: a member turned it off (`manual`), every attempt
 * failed for days (`failing`), or the receiver answered 410 Gone (`gone`),
 * which asks for no more deliveries.
 */
export const DisabledReasonSchema = Schema.Literals([
  "manual",
  "failing",
  "gone",
]);

export type DisabledReason = typeof DisabledReasonSchema.Type;

/**
 * What an endpoint hears: the events of its own workspace (`workspace`),
 * or, in a partner's home workspace, those of every workspace the partner
 * owns too (`partner`). Chosen when it is created.
 */
export const EndpointScopeSchema = Schema.Literals(["workspace", "partner"]);

export type EndpointScope = typeof EndpointScopeSchema.Type;

export const EndpointStatusSchema = Schema.Union([
  Schema.TaggedStruct("enabled", {}),
  Schema.TaggedStruct("disabled", {
    at: Schema.DateTimeUtc,
    reason: DisabledReasonSchema,
  }),
]);

export type EndpointStatus = typeof EndpointStatusSchema.Type;

/**
 * Where a workspace is told what happens in it: an address, the events it
 * wants, and whether it is on. Its signing secret is kept apart, encrypted
 * (`EndpointSecrets`); the endpoint only knows until when the secret it had
 * before the last rotation still signs.
 */
export class WebhookEndpoint extends Schema.Class<WebhookEndpoint>(
  "peal-server/webhooks/domain/WebhookEndpoint"
)({
  createdAt: Schema.DateTimeUtc,
  description: EndpointDescriptionSchema,
  eventTypes: EventTypesSchema,
  // When its attempts started failing, none since one succeeded.
  failingSince: Schema.Option(Schema.DateTimeUtc),
  id: WebhookEndpointIdSchema,
  previousSecretExpiresAt: Schema.Option(Schema.DateTimeUtc),
  scope: EndpointScopeSchema.pipe(
    Schema.withConstructorDefault(Effect.succeed("workspace" as const))
  ),
  status: EndpointStatusSchema,
  updatedAt: Schema.DateTimeUtc,
  url: WebhookUrlSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** What a member chooses for an endpoint. */
export interface EndpointSettings {
  readonly description: string;
  readonly enabled: boolean;
  readonly eventTypes: readonly [
    SubscribableEventType,
    ...SubscribableEventType[],
  ];
  readonly url: WebhookUrl;
}

type Fields = ConstructorParameters<typeof WebhookEndpoint>[0];

// The endpoint with some fields changed.
const withFields = (
  endpoint: WebhookEndpoint,
  changed: Partial<Fields>
): WebhookEndpoint =>
  new WebhookEndpoint({
    createdAt: endpoint.createdAt,
    description: endpoint.description,
    eventTypes: endpoint.eventTypes,
    failingSince: endpoint.failingSince,
    id: endpoint.id,
    previousSecretExpiresAt: endpoint.previousSecretExpiresAt,
    scope: endpoint.scope,
    status: endpoint.status,
    updatedAt: endpoint.updatedAt,
    url: endpoint.url,
    workspaceId: endpoint.workspaceId,
    ...changed,
  });

// Each type once, in the order the vocabulary lists them.
const distinct = (types: EndpointSettings["eventTypes"]): EventTypes => {
  const [first, ...rest] = SubscribableEventTypeSchema.literals.filter((type) =>
    types.includes(type)
  );

  return first === undefined ? types : [first, ...rest];
};

const statusOf = (
  enabled: boolean,
  current: Option.Option<EndpointStatus>,
  now: DateTime.Utc
): EndpointStatus => {
  if (enabled) {
    return { _tag: "enabled" };
  }

  // An endpoint already off stays off for the reason it was.
  return current.pipe(
    Option.filter((status) => status._tag === "disabled"),
    Option.getOrElse((): EndpointStatus => ({
      _tag: "disabled",
      at: now,
      reason: "manual",
    }))
  );
};

/** A new endpoint of the workspace. */
export const createEndpoint = (
  id: WebhookEndpointId,
  workspaceId: WorkspaceId,
  settings: EndpointSettings,
  now: DateTime.Utc,
  scope: EndpointScope = "workspace"
): WebhookEndpoint =>
  new WebhookEndpoint({
    createdAt: now,
    description: settings.description,
    eventTypes: distinct(settings.eventTypes),
    failingSince: Option.none(),
    id,
    previousSecretExpiresAt: Option.none(),
    scope,
    status: statusOf(settings.enabled, Option.none(), now),
    updatedAt: now,
    url: settings.url,
    workspaceId,
  });

/**
 * The endpoint with what a member changed. Turning it back on forgets the
 * failures that turned it off, so it gets its days again.
 */
export const changeEndpoint = (
  endpoint: WebhookEndpoint,
  change: Partial<EndpointSettings>,
  now: DateTime.Utc
): WebhookEndpoint => {
  const enabled = change.enabled ?? endpoint.status._tag === "enabled";
  const turnedOn = enabled && endpoint.status._tag === "disabled";

  return withFields(endpoint, {
    description: change.description ?? endpoint.description,
    eventTypes:
      change.eventTypes === undefined
        ? endpoint.eventTypes
        : distinct(change.eventTypes),
    failingSince: turnedOn ? Option.none() : endpoint.failingSince,
    status: statusOf(enabled, Option.some(endpoint.status), now),
    updatedAt: now,
    url: change.url ?? endpoint.url,
  });
};

/**
 * The endpoint once its secret was replaced at `now`: the one it had still
 * signs, beside the new one, for `secretOverlap`.
 */
export const rotateSecret = (
  endpoint: WebhookEndpoint,
  now: DateTime.Utc
): WebhookEndpoint =>
  withFields(endpoint, {
    previousSecretExpiresAt: Option.some(
      DateTime.addDuration(now, secretOverlap)
    ),
    updatedAt: now,
  });

/** Whether the secret before the last rotation still signs at `now`. */
export const previousSecretSigns = (
  endpoint: WebhookEndpoint,
  now: DateTime.Utc
): boolean =>
  Option.exists(endpoint.previousSecretExpiresAt, (expiresAt) =>
    DateTime.isLessThan(now, expiresAt)
  );

/**
 * Whether the endpoint hears what happens in the workspaces a partner
 * owns, beside its own workspace's events.
 */
export const hearsPartner = (endpoint: WebhookEndpoint): boolean =>
  endpoint.scope === "partner";

/**
 * Whether the endpoint is sent an event of this type: while it is on, those
 * it subscribes to. A test event goes to the endpoint it was asked for,
 * whatever it subscribes to.
 */
export const wants = (
  endpoint: WebhookEndpoint,
  type: WebhookEventType
): boolean =>
  endpoint.status._tag === "enabled" &&
  (type === "webhook.test" || endpoint.eventTypes.includes(type));

/**
 * Whether an endpoint failing since `failingSince`, and failing again at
 * `now`, has failed long enough to be turned off.
 */
export const failedTooLong = (
  failingSince: DateTime.Utc,
  now: DateTime.Utc
): boolean =>
  Duration.isGreaterThanOrEqualTo(
    DateTime.distance(failingSince, now),
    turnOffAfterFailingFor
  );
