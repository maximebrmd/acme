import { Effect, Option, Redacted, Schema } from "effect";
import {
  CurrentMember,
  defaultWebhookDeliveryPageSize,
  maxWebhookEndpoints,
  maxWebhookHeaders,
} from "peal-contract";
import type { WebhookUrlRefusal } from "peal-contract";

import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { WebhookTools } from "#app/mcp/webhooks-tools.ts";
import { actorOf } from "#shared/api/actor.ts";
import {
  toBulkRedeliveryView,
  toDeliveryView,
  toEndpointView,
} from "#webhooks/api/webhook-view.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";

const decodeCursor = Schema.decodeUnknownOption(WebhookDeliveryIdSchema);

// Why Peal will not deliver to an address, in words the user can act on.
const urlRefusals: Readonly<Record<WebhookUrlRefusal, string>> = {
  credentials:
    "The address carries a user name or a password: Peal signs each delivery instead, so leave them out.",
  malformed: "That is not a URL.",
  notHttps: "The address must be HTTPS, on the default port.",
  notPublic:
    "The address names a host that is not public (loopback, private or reserved), where Peal sends nothing.",
  tooLong: "The address is longer than 2048 characters.",
  unknownHost: "The address names a host that does not exist.",
};

const urlRefused = ({ reason }: { readonly reason: WebhookUrlRefusal }) =>
  refuse(urlRefusals[reason]);

const noEndpoint = () =>
  refuse("The workspace has no webhook endpoint with this id.");

const filterRefused = ({
  field,
}: {
  readonly field: "channelIds" | "workspaceIds";
}) =>
  refuse(
    field === "workspaceIds"
      ? "Only a partner endpoint, in a partner account's home workspace, takes workspaceIds: an endpoint of the workspace scope hears its own workspace only."
      : "channelIds must be a list of channel ids, as list_channels answers them."
  );

const tooManySends = ({
  allowed,
  retryAfterSeconds,
}: {
  readonly allowed: number;
  readonly retryAfterSeconds: number;
}) =>
  refuse(
    `The workspace sent ${String(allowed)} of these an hour, the most it may, or this call would send more than are left: nothing was sent. Try again in ${String(retryAfterSeconds)} seconds.`
  );

const noSecrets = () =>
  refuse(
    "This server cannot keep a signing secret: its operator has not set the keys that encrypt them (PEAL_TOKEN_KEYS)."
  );

const headersRefused = () =>
  refuse(
    `An endpoint takes ${String(maxWebhookHeaders)} headers at most, each named once whatever its case, with a name that is an HTTP token and not one Peal sets (host, user-agent, cookie, expect, accept-encoding, a connection's own, or any content- or webhook- name), and a value of visible ASCII on one line; a header given without a value keeps the endpoint's, so it must be one the endpoint has.`
  );

const offEndpoint = () =>
  refuse(
    "The endpoint is turned off: turn it back on with update_webhook (enabled: true) first."
  );

// A cursor is the id of the last delivery of the page before.
const cursorOf = (cursor: string | undefined) => {
  const after = Option.fromUndefinedOr(cursor).pipe(Option.map(decodeCursor));

  return Option.isSome(after) && Option.isNone(after.value)
    ? refuse("That cursor is not one a page of deliveries answered.")
    : Effect.succeed(Option.flatten(after));
};

/** What the webhook tools do, through the webhooks context's use cases. */
export const WebhookToolsLive = WebhookTools.toLayer(
  Effect.gen(function* webhookTools() {
    const endpoints = yield* WebhookEndpoints;
    const deliveries = yield* WebhookDeliveries;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return WebhookTools.of({
      create_webhook: (asked) =>
        Effect.gen(function* create() {
          const { endpoint, secret } = yield* endpoints
            .create(yield* actor, {
              channelIds: asked.channelIds ?? [],
              description: asked.description ?? "",
              enabled: asked.enabled ?? true,
              eventTypes: asked.eventTypes,
              headers: asked.headers ?? [],
              scope: asked.scope ?? "workspace",
              url: asked.url,
              workspaceIds: asked.workspaceIds ?? [],
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                FilterRefused: filterRefused,
                HeadersRefused: headersRefused,
                InvalidWebhookUrl: urlRefused,
                MissingPermission: notAllowed("manage webhooks"),
                PartnerScopeUnavailable: () =>
                  refuse("The workspace has no partner account."),
                SecretsNotConfigured: noSecrets,
                TooManyEndpoints: () =>
                  refuse(
                    `The workspace has ${String(maxWebhookEndpoints)} webhook endpoints, the most it may: delete one first.`
                  ),
                UrlNotDeliverable: urlRefused,
              })
            );

          return {
            endpoint: toEndpointView(endpoint),
            secret: Redacted.value(secret),
          };
        }),
      list_webhook_deliveries: ({
        cursor,
        endpointId,
        eventType,
        limit,
        status,
      }) =>
        Effect.gen(function* listDeliveries() {
          const request = {
            after: yield* cursorOf(cursor),
            limit: limit ?? defaultWebhookDeliveryPageSize,
          };

          const filters = {
            eventType: Option.fromUndefinedOr(eventType),
            status: Option.fromUndefinedOr(status),
          };

          const page =
            endpointId === undefined
              ? yield* deliveries
                  .search(
                    yield* actor,
                    {
                      ...filters,
                      endpointId: Option.none(),
                      since: Option.none(),
                      until: Option.none(),
                    },
                    request
                  )
                  .pipe(
                    Effect.catchTags({
                      DatabaseError: Effect.die,
                      MissingPermission: notAllowed("read webhooks"),
                    })
                  )
              : yield* deliveries
                  .page(yield* actor, endpointId, request, filters)
                  .pipe(
                    Effect.catchTags({
                      DatabaseError: Effect.die,
                      EndpointNotFound: noEndpoint,
                      MissingPermission: notAllowed("read webhooks"),
                    })
                  );

          return {
            items: page.items.map(toDeliveryView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      list_webhooks: () =>
        Effect.gen(function* list() {
          const found = yield* endpoints.list(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read webhooks"),
            })
          );

          return { endpoints: found.map(toEndpointView) };
        }),
      redeliver_webhooks: (asked) =>
        Effect.gen(function* redeliver() {
          if (
            (asked.deliveryIds === undefined) ===
            (asked.endpointId === undefined)
          ) {
            return yield* refuse(
              "Give either deliveryIds or endpointId, not both and not neither."
            );
          }

          const redelivery =
            asked.endpointId === undefined
              ? { _tag: "ids" as const, deliveryIds: asked.deliveryIds ?? [] }
              : {
                  _tag: "failed" as const,
                  endpointId: asked.endpointId,
                  eventType: Option.fromUndefinedOr(asked.eventType),
                  since: Option.fromUndefinedOr(asked.since),
                  until: Option.fromUndefinedOr(asked.until),
                };

          return yield* deliveries.redeliverMany(yield* actor, redelivery).pipe(
            Effect.map(toBulkRedeliveryView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              EndpointNotFound: noEndpoint,
              MissingPermission: notAllowed("manage webhooks"),
              TooManyManualSends: tooManySends,
            })
          );
        }),
      send_test_webhook: ({ endpointId, eventType }) =>
        Effect.gen(function* sendTest() {
          return yield* endpoints
            .sendTest(yield* actor, endpointId, eventType)
            .pipe(
              Effect.map(toDeliveryView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                EndpointDisabled: offEndpoint,
                EndpointNotFound: noEndpoint,
                MissingPermission: notAllowed("manage webhooks"),
                TooManyManualSends: tooManySends,
              })
            );
        }),
      update_webhook: ({ change, endpointId }) =>
        Effect.gen(function* update() {
          return yield* endpoints.update(yield* actor, endpointId, change).pipe(
            Effect.map(toEndpointView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              EndpointNotFound: noEndpoint,
              FilterRefused: filterRefused,
              HeaderValuesRequired: () =>
                refuse(
                  "The new address is on another origin (scheme, host or port) and the endpoint has headers, whose values are never sent to another origin: ask the user for each header's value and give them all in headers in the same call, or give headers: [] to remove them. Nothing was saved."
                ),
              HeadersRefused: headersRefused,
              InvalidWebhookUrl: urlRefused,
              MissingPermission: notAllowed("manage webhooks"),
              SecretsNotConfigured: noSecrets,
              UrlNotDeliverable: urlRefused,
            })
          );
        }),
    });
  })
);
