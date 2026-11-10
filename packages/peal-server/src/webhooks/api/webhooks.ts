import { Effect, Option, Redacted, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  defaultWebhookDeliveryPageSize,
  Forbidden,
  TooManyWebhookEndpoints,
  WebhookDeliveryNotFound,
  TooManyWebhookSends,
  WebhookEndpointDisabled,
  WebhookEndpointNotFound,
  WebhooksNotConfigured,
  WebhookUrlRefused,
} from "peal-contract";
import type { WebhookUrlRefusal } from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import type { EndpointWithSecret } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";

import { toDeliveryView, toEndpointView } from "./webhook-view.ts";

const decodeCursor = Schema.decodeUnknownOption(WebhookDeliveryIdSchema);

const forbidden = () => Effect.fail(new Forbidden());

const endpointNotFound = () => Effect.fail(new WebhookEndpointNotFound());

const endpointDisabled = () => Effect.fail(new WebhookEndpointDisabled());

const tooManySends = ({ allowed }: { readonly allowed: number }) =>
  Effect.fail(new TooManyWebhookSends({ allowed }));

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
              description: payload.description ?? "",
              enabled: payload.enabled ?? true,
              eventTypes: payload.eventTypes,
              url: payload.url,
            })
            .pipe(
              Effect.map(withSecret),
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidWebhookUrl: urlRefused,
                MissingPermission: forbidden,
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

          // A cursor is the id of the last delivery of the page before.
          const after = Option.fromUndefinedOr(query.cursor).pipe(
            Option.map(decodeCursor)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* new HttpApiError.BadRequest();
          }

          const page = yield* deliveries
            .page(actor, params.endpointId, {
              after: Option.flatten(after),
              limit: query.limit ?? defaultWebhookDeliveryPageSize,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                EndpointNotFound: endpointNotFound,
                MissingPermission: forbidden,
              })
            );

          return {
            items: page.items.map(toDeliveryView),
            nextCursor: Option.getOrNull(page.next),
          };
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
      sendTest: ({ params }) =>
        Effect.gen(function* sendTest() {
          const actor = actorOf(yield* CurrentMember);

          return yield* endpoints.sendTest(actor, params.endpointId).pipe(
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
                InvalidWebhookUrl: urlRefused,
                MissingPermission: forbidden,
                UrlNotDeliverable: urlRefused,
              })
            );
        }),
    });
  })
);
