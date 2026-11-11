import { Effect, Option, Redacted, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  defaultWebhookDeliveryPageSize,
  PartnerNotFound,
  TooManyWebhookEndpoints,
  WebhookDeliveryNotFound,
  TooManyWebhookSends,
  WebhookEndpointDisabled,
  WebhookEndpointNotFound,
  WebhookFilterRefused,
  WebhookHeaderValuesRequired,
  WebhookHeadersRefused,
  WebhooksNotConfigured,
  WebhookUrlRefused,
} from "peal-contract";
import type { WebhookUrlRefusal } from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { setAnswerHeader } from "#shared/api/answer-headers.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import type { DeliveryPage } from "#webhooks/application/ports/delivery-store.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import type { EndpointWithSecret } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

import {
  toBulkRedeliveryView,
  toDeliveryView,
  toEndpointView,
} from "./webhook-view.ts";

const decodeCursor = Schema.decodeUnknownOption(WebhookDeliveryIdSchema);

// A cursor is the id of the last delivery of the page before: one that is
// not is a bad request.
const cursorOf = (
  cursor: string | undefined
): Effect.Effect<Option.Option<WebhookDeliveryId>, HttpApiError.BadRequest> => {
  const after = Option.fromUndefinedOr(cursor).pipe(Option.map(decodeCursor));

  return Option.isSome(after) && Option.isNone(after.value)
    ? Effect.fail(new HttpApiError.BadRequest())
    : Effect.succeed(Option.flatten(after));
};

const pageOf = ({ items, next }: DeliveryPage) => ({
  items: items.map(toDeliveryView),
  nextCursor: Option.getOrNull(next),
});

const filterRefused = ({
  field,
}: {
  readonly field: "channelIds" | "workspaceIds";
}) => Effect.fail(new WebhookFilterRefused({ field }));

const endpointNotFound = () => Effect.fail(new WebhookEndpointNotFound());

// The contract's schema refuses a new endpoint's headers first, by the same
// rules (test/webhooks/api/contract.test.ts): a refusal there is a bug.
const headersRefused = () =>
  Effect.die("The contract accepted headers the endpoint refuses");

// A change's header without a value the endpoint does not have.
const noHeaderToKeep = () => Effect.fail(new WebhookHeadersRefused());

// A move to another origin that keeps a header's value.
const headerValuesRequired = () =>
  Effect.fail(new WebhookHeaderValuesRequired());

const endpointDisabled = () => Effect.fail(new WebhookEndpointDisabled());

const tooManySends = ({
  allowed,
  retryAfterSeconds,
}: {
  readonly allowed: number;
  readonly retryAfterSeconds: number;
}) =>
  setAnswerHeader("Retry-After", String(retryAfterSeconds)).pipe(
    Effect.andThen(
      Effect.fail(new TooManyWebhookSends({ allowed, retryAfterSeconds }))
    )
  );

const urlRefused = ({ reason }: { readonly reason: WebhookUrlRefusal }) =>
  Effect.fail(new WebhookUrlRefused({ reason }));

// The operator's to fix, so it is logged; the member is told it is not
// theirs.
const notConfigured = () =>
  Effect.logError(
    "A webhook secret was not issued: PEAL_TOKEN_KEYS is not set"
  ).pipe(Effect.andThen(Effect.fail(new WebhooksNotConfigured())));

// The one answer that carries the secret, which nothing else ever reads.
const withSecret = ({ endpoint, secret }: EndpointWithSecret) => ({
  endpoint: toEndpointView(endpoint),
  secret: Redacted.value(secret),
});

// A failure of the server's own (the database, a bug) is a defect: 500.
export const WebhooksHandlers = HttpApiBuilder.group(
  Api,
  "webhooks",
  Effect.fn(function* webhooksHandlers(handlers) {
    const endpoints = yield* WebhookEndpoints;
    const deliveries = yield* WebhookDeliveries;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints
            .create(actor, {
              channelIds: payload.channelIds ?? [],
              description: payload.description ?? "",
              enabled: payload.enabled ?? true,
              eventTypes: payload.eventTypes,
              headers: payload.headers ?? [],
              scope: payload.scope ?? "workspace",
              url: payload.url,
              workspaceIds: payload.workspaceIds ?? [],
            })
            .pipe(
              Effect.map(withSecret),
              Effect.catchTags({
                DatabaseError: Effect.die,
                FilterRefused: filterRefused,
                HeadersRefused: headersRefused,
                InvalidWebhookUrl: urlRefused,
                MissingPermission: forbidden,
                PartnerScopeUnavailable: () =>
                  Effect.fail(new PartnerNotFound()),
                SecretsNotConfigured: notConfigured,
                TooManyEndpoints: ({ allowed }) =>
                  Effect.fail(new TooManyWebhookEndpoints({ allowed })),
                UrlNotDeliverable: urlRefused,
              })
            );
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);

          yield* endpoints.remove(actor, params.endpointId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              EndpointNotFound: endpointNotFound,
              MissingPermission: forbidden,
            })
          );
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints.get(actor, params.endpointId).pipe(
            Effect.map(toEndpointView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              EndpointNotFound: endpointNotFound,
              MissingPermission: forbidden,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints.list(actor).pipe(
            Effect.map((all) => all.map(toEndpointView)),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      listDeliveries: ({ params, query }) =>
        Effect.gen(function* listDeliveries() {
          const actor = actorOf(yield* CurrentMember);

          const page = yield* deliveries
            .page(
              actor,
              params.endpointId,
              {
                after: yield* cursorOf(query.cursor),
                limit: query.limit ?? defaultWebhookDeliveryPageSize,
              },
              {
                eventType: Option.fromUndefinedOr(query.eventType),
                status: Option.fromUndefinedOr(query.status),
              }
            )
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                EndpointNotFound: endpointNotFound,
                MissingPermission: forbidden,
              })
            );

          return pageOf(page);
        }),
      redeliver: ({ params }) =>
        Effect.gen(function* redeliver() {
          const actor = actorOf(yield* CurrentMember);

          return yield* deliveries
            .redeliver(actor, params.endpointId, params.deliveryId)
            .pipe(
              Effect.map(toDeliveryView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                DeliveryNotFound: () =>
                  Effect.fail(new WebhookDeliveryNotFound()),
                EndpointDisabled: endpointDisabled,
                EndpointNotFound: endpointNotFound,
                MissingPermission: forbidden,
                TooManyManualSends: tooManySends,
              })
            );
        }),
      redeliverMany: ({ payload }) =>
        Effect.gen(function* redeliverMany() {
          const actor = actorOf(yield* CurrentMember);

          return yield* deliveries
            .redeliverMany(
              actor,
              "deliveryIds" in payload
                ? { _tag: "ids", deliveryIds: payload.deliveryIds }
                : {
                    _tag: "failed",
                    endpointId: payload.endpointId,
                    eventType: Option.fromUndefinedOr(payload.eventType),
                    since: Option.fromUndefinedOr(payload.since),
                    until: Option.fromUndefinedOr(payload.until),
                  }
            )
            .pipe(
              Effect.map(toBulkRedeliveryView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                EndpointNotFound: endpointNotFound,
                MissingPermission: forbidden,
                TooManyManualSends: tooManySends,
              })
            );
        }),
      rotateSecret: ({ params }) =>
        Effect.gen(function* rotateSecret() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints.rotateSecret(actor, params.endpointId).pipe(
            Effect.map(withSecret),
            Effect.catchTags({
              DatabaseError: Effect.die,
              EndpointNotFound: endpointNotFound,
              MissingPermission: forbidden,
              SecretsNotConfigured: notConfigured,
            })
          );
        }),
      searchDeliveries: ({ query }) =>
        Effect.gen(function* searchDeliveries() {
          const actor = actorOf(yield* CurrentMember);

          const page = yield* deliveries
            .search(
              actor,
              {
                endpointId: Option.fromUndefinedOr(query.endpointId),
                eventType: Option.fromUndefinedOr(query.eventType),
                since: Option.fromUndefinedOr(query.since),
                status: Option.fromUndefinedOr(query.status),
                until: Option.fromUndefinedOr(query.until),
              },
              {
                after: yield* cursorOf(query.cursor),
                limit: query.limit ?? defaultWebhookDeliveryPageSize,
              }
            )
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );

          return pageOf(page);
        }),
      sendTest: ({ params, query }) =>
        Effect.gen(function* sendTest() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints
            .sendTest(actor, params.endpointId, query.eventType)
            .pipe(
              Effect.map(toDeliveryView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                EndpointDisabled: endpointDisabled,
                EndpointNotFound: endpointNotFound,
                MissingPermission: forbidden,
                TooManyManualSends: tooManySends,
              })
            );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints
            .update(actor, params.endpointId, payload)
            .pipe(
              Effect.map(toEndpointView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                EndpointNotFound: endpointNotFound,
                FilterRefused: filterRefused,
                HeaderValuesRequired: headerValuesRequired,
                HeadersRefused: noHeaderToKeep,
                InvalidWebhookUrl: urlRefused,
                MissingPermission: forbidden,
                SecretsNotConfigured: notConfigured,
                UrlNotDeliverable: urlRefused,
              })
            );
        }),
    });
  })
);
