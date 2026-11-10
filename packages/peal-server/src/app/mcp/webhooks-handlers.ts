import { Effect, Option, Redacted, Schema } from "effect";
import {
  CurrentMember,
  defaultWebhookDeliveryPageSize,
  maxWebhookEndpoints,
} from "peal-contract";
import type { WebhookUrlRefusal } from "peal-contract";

import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { WebhookTools } from "#app/mcp/webhooks-tools.ts";
import { actorOf } from "#shared/api/actor.ts";
import { toDeliveryView, toEndpointView } from "#webhooks/api/webhook-view.ts";
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
              description: asked.description ?? "",
              enabled: asked.enabled ?? true,
              eventTypes: asked.eventTypes,
              url: asked.url,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidWebhookUrl: urlRefused,
                MissingPermission: notAllowed("manage webhooks"),
                // The tool adds endpoints that hear their own workspace.
                PartnerScopeUnavailable: () =>
                  refuse("The workspace has no partner account."),
                SecretsNotConfigured: () =>
                  refuse(
                    "This server cannot keep a signing secret: its operator has not set the keys that encrypt them (PEAL_TOKEN_KEYS)."
                  ),
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
      list_webhook_deliveries: ({ cursor, endpointId, limit }) =>
        Effect.gen(function* listDeliveries() {
          // A cursor is the id of the last delivery of the page before.
          const after = Option.fromUndefinedOr(cursor).pipe(
            Option.map(decodeCursor)
          );

          if (Option.isSome(after) && Option.isNone(after.value)) {
            return yield* refuse(
              "That cursor is not one a page of deliveries answered."
            );
          }

          const page = yield* deliveries
            .page(yield* actor, endpointId, {
              after: Option.flatten(after),
              limit: limit ?? defaultWebhookDeliveryPageSize,
            })
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
    });
  })
);
