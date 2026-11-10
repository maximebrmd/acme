import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";
import type { Redacted } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  manualSendsPerHour,
  maxEndpointsPerWorkspace,
} from "#webhooks/domain/delivery-policy.ts";
import type { InvalidWebhookUrl } from "#webhooks/domain/invalid-webhook-url.ts";
import { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import {
  changeEndpoint,
  createEndpoint,
  rotateSecret,
} from "#webhooks/domain/webhook-endpoint.ts";
import type {
  EndpointScope,
  EndpointSettings,
  WebhookEndpoint,
} from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { parseWebhookUrl } from "#webhooks/domain/webhook-url.ts";

import { dispatch } from "./dispatch.ts";
import { EndpointDisabled } from "./endpoint-disabled.ts";
import { EndpointNotFound } from "./endpoint-not-found.ts";
import { PartnerScopeUnavailable } from "./partner-scope-unavailable.ts";
import type { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { DeliveryStore } from "./ports/delivery-store.ts";
import { EndpointSecrets } from "./ports/endpoint-secrets.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";
import { EventOrigins } from "./ports/event-origins.ts";
import { ManualSends } from "./ports/manual-sends.ts";
import { WebhookTransport } from "./ports/webhook-transport.ts";
import type { SecretsNotConfigured } from "./secrets-not-configured.ts";
import { TooManyEndpoints } from "./too-many-endpoints.ts";
import { TooManyManualSends } from "./too-many-manual-sends.ts";
import type { UrlNotDeliverable } from "./url-not-deliverable.ts";

/** A new endpoint, as a member asks for one: its address not yet checked. */
export interface NewEndpoint extends Omit<EndpointSettings, "url"> {
  /** What it hears: its workspace's events, unless `partner` says more. */
  readonly scope?: EndpointScope;
  readonly url: string;
}

/** What to change of an endpoint: what is left out stays. */
export type EndpointChange = Partial<Omit<NewEndpoint, "scope">>;

/** An endpoint with its signing secret, as it is shown once. */
export interface EndpointWithSecret {
  readonly endpoint: WebhookEndpoint;
  readonly secret: Redacted.Redacted;
}

type UrlRefused = InvalidWebhookUrl | UrlNotDeliverable;

const reading = (actor: Actor) =>
  Effect.fromResult(authorize(actor, "webhook:read"));

const managing = (actor: Actor) =>
  Effect.fromResult(authorize(actor, "webhook:manage"));

const decodeEndpointId = Schema.decodeUnknownOption(WebhookEndpointIdSchema);

/**
 * A workspace's webhook endpoints, for someone acting in it: each use case
 * checks the actor's permission first, then works in the actor's workspace
 * only. An id that names no endpoint of the workspace, including one that
 * is not an endpoint id at all, is EndpointNotFound.
 *
 * | Use case                                        | Needs          |
 * | ----------------------------------------------- | -------------- |
 * | list, get                                       | webhook:read   |
 * | create, update, remove, rotateSecret, sendTest  | webhook:manage |
 */
export class WebhookEndpoints extends Context.Service<
  WebhookEndpoints,
  {
    /** The workspace's endpoints, oldest first. */
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly WebhookEndpoint[],
      DatabaseError | MissingPermission
    >;
    readonly get: (
      actor: Actor,
      endpointId: string
    ) => Effect.Effect<
      WebhookEndpoint,
      DatabaseError | EndpointNotFound | MissingPermission
    >;
    /**
     * Adds an endpoint, with a new secret, which the answer shows this
     * once. Its address must be one Peal delivers to, and the workspace
     * have fewer than `maxEndpointsPerWorkspace`, counted in turn with its
     * other additions. One of the `partner` scope, which hears every
     * workspace a partner owns, is added to the partner's home workspace
     * only.
     */
    readonly create: (
      actor: Actor,
      endpoint: NewEndpoint
    ) => Effect.Effect<
      EndpointWithSecret,
      | DatabaseError
      | MissingPermission
      | PartnerScopeUnavailable
      | SecretsNotConfigured
      | TooManyEndpoints
      | UrlRefused
    >;
    readonly update: (
      actor: Actor,
      endpointId: string,
      change: EndpointChange
    ) => Effect.Effect<
      WebhookEndpoint,
      DatabaseError | EndpointNotFound | MissingPermission | UrlRefused
    >;
    /** Deletes the endpoint, its secrets and its delivery log. */
    readonly remove: (
      actor: Actor,
      endpointId: string
    ) => Effect.Effect<
      void,
      DatabaseError | EndpointNotFound | MissingPermission
    >;
    /**
     * Replaces the endpoint's secret with a new one, which the answer
     * shows this once. The one before still signs, beside it, for
     * `secretOverlap`.
     */
    readonly rotateSecret: (
      actor: Actor,
      endpointId: string
    ) => Effect.Effect<
      EndpointWithSecret,
      | DatabaseError
      | EndpointNotFound
      | MissingPermission
      | SecretsNotConfigured
    >;
    /**
     * Sends the endpoint a `webhook.test` event, whatever it subscribes
     * to, and answers with its delivery, not yet attempted.
     */
    readonly sendTest: (
      actor: Actor,
      endpointId: string
    ) => Effect.Effect<
      WebhookDelivery,
      | DatabaseError
      | EndpointDisabled
      | EndpointNotFound
      | MissingPermission
      | TooManyManualSends
    >;
  }
>()("peal-server/webhooks/application/WebhookEndpoints") {
  static readonly layer = Layer.effect(
    WebhookEndpoints,
    Effect.gen(function* WebhookEndpointsLive() {
      const store = yield* EndpointStore;
      const deliveries = yield* DeliveryStore;
      const manual = yield* ManualSends;
      const secrets = yield* EndpointSecrets;
      const transport = yield* WebhookTransport;
      const origins = yield* EventOrigins;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<DeliveryJobs | DeliveryStore | Ids>();

      const found = Effect.fn("WebhookEndpoints.found")(function* found(
        actor: Actor,
        endpointId: string
      ) {
        const id = decodeEndpointId(endpointId);

        const endpoint = Option.isSome(id)
          ? yield* store.findIn(actor.workspaceId, id.value)
          : Option.none<WebhookEndpoint>();

        return Option.isSome(endpoint)
          ? endpoint.value
          : yield* new EndpointNotFound({ endpointId });
      });

      // The address as an endpoint keeps it, once it is one Peal delivers
      // to now.
      const deliverable = Effect.fn("WebhookEndpoints.deliverable")(
        function* deliverable(input: string) {
          const url = yield* Effect.fromResult(parseWebhookUrl(input));

          yield* transport.check(url);

          return url;
        }
      );

      const create = Effect.fn("WebhookEndpoints.create")(function* create(
        actor: Actor,
        asked: NewEndpoint
      ) {
        yield* managing(actor);

        const { scope = "workspace", ...settings } = asked;

        if (
          scope === "partner" &&
          !(yield* origins.isPartnerHome(actor.workspaceId))
        ) {
          return yield* new PartnerScopeUnavailable({
            workspaceId: actor.workspaceId,
          });
        }

        const url = yield* deliverable(settings.url);

        const endpoint = createEndpoint(
          yield* newId(WebhookEndpointIdSchema),
          actor.workspaceId,
          { ...settings, url },
          yield* DateTime.now,
          scope
        );

        const issued = yield* secrets.issue(endpoint.id);

        yield* store.addingTo(
          actor.workspaceId,
          Effect.gen(function* addWithinLimit() {
            const existing = yield* store.list(actor.workspaceId);

            yield* existing.length >= maxEndpointsPerWorkspace
              ? Effect.fail(
                  new TooManyEndpoints({ allowed: maxEndpointsPerWorkspace })
                )
              : store.insert(endpoint, issued.sealed);
          })
        );

        const created: EndpointWithSecret = { endpoint, secret: issued.secret };

        return created;
      }, Effect.provideContext(ports));

      const update = Effect.fn("WebhookEndpoints.update")(function* update(
        actor: Actor,
        endpointId: string,
        { url, ...change }: EndpointChange
      ) {
        yield* managing(actor);

        const current = yield* found(actor, endpointId);

        const changed = changeEndpoint(
          current,
          url === undefined
            ? change
            : { ...change, url: yield* deliverable(url) },
          yield* DateTime.now
        );

        if (!(yield* store.update(changed, current))) {
          return yield* new EndpointNotFound({ endpointId });
        }

        // As it now stands: Peal may have turned it off meanwhile.
        return Option.getOrElse(yield* store.get(changed.id), () => changed);
      });

      const remove = Effect.fn("WebhookEndpoints.remove")(function* remove(
        actor: Actor,
        endpointId: string
      ) {
        yield* managing(actor);

        const { id } = yield* found(actor, endpointId);

        if (!(yield* store.remove(actor.workspaceId, id))) {
          yield* new EndpointNotFound({ endpointId });
        }
      });

      const rotate = Effect.fn("WebhookEndpoints.rotateSecret")(
        function* rotate(actor: Actor, endpointId: string) {
          yield* managing(actor);

          const current = yield* found(actor, endpointId);
          const issued = yield* secrets.issue(current.id);
          const rotated = rotateSecret(current, yield* DateTime.now);

          if (!(yield* store.rotate(rotated, issued.sealed))) {
            return yield* new EndpointNotFound({ endpointId });
          }

          const answer: EndpointWithSecret = {
            endpoint: rotated,
            secret: issued.secret,
          };

          return answer;
        }
      );

      const sendTest = Effect.fn("WebhookEndpoints.sendTest")(
        function* sendTest(actor: Actor, endpointId: string) {
          yield* managing(actor);

          const endpoint = yield* found(actor, endpointId);

          if (endpoint.status._tag === "disabled") {
            return yield* new EndpointDisabled({ endpointId: endpoint.id });
          }

          if (!(yield* manual.take(actor.workspaceId))) {
            return yield* new TooManyManualSends({
              allowed: manualSendsPerHour,
            });
          }

          const recorded = new RecordedEvent({
            event: {
              data: {
                endpointId: endpoint.id,
                workspaceId: endpoint.workspaceId,
              },
              type: "webhook.test",
            },
            id: yield* newId(WebhookEventIdSchema),
            occurredAt: yield* DateTime.now,
            workspaceId: endpoint.workspaceId,
          });

          return yield* transaction(
            deliveries
              .recordEvent(recorded, `webhook-test:${recorded.id}`)
              .pipe(Effect.andThen(dispatch(endpoint, recorded)))
          );
        },
        Effect.provideContext(ports)
      );

      return WebhookEndpoints.of({
        create,
        get: (actor, endpointId) =>
          reading(actor).pipe(Effect.andThen(found(actor, endpointId))),
        list: (actor) =>
          reading(actor).pipe(Effect.andThen(store.list(actor.workspaceId))),
        remove,
        rotateSecret: rotate,
        sendTest,
        update,
      });
    })
  );
}
