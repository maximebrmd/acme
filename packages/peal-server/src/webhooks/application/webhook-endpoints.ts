import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";
import type { Redacted } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { maxEndpointsPerWorkspace } from "#webhooks/domain/delivery-policy.ts";
import {
  EndpointHeadersSchema,
  HeaderChangesSchema,
} from "#webhooks/domain/endpoint-headers.ts";
import type {
  EndpointHeaders,
  HeaderChange,
  SealedHeader,
} from "#webhooks/domain/endpoint-headers.ts";
import type { InvalidWebhookUrl } from "#webhooks/domain/invalid-webhook-url.ts";
import { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { sampleOf } from "#webhooks/domain/sample-events.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import {
  changeEndpoint,
  createEndpoint,
  ChannelFilterSchema,
  rotateSecret,
  takesWorkspaceFilter,
  WorkspaceFilterSchema,
} from "#webhooks/domain/webhook-endpoint.ts";
import type {
  EndpointScope,
  EndpointSettings,
  WebhookEndpoint,
} from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import type { SubscribableEventType } from "#webhooks/domain/webhook-event-type.ts";
import type { WebhookEvent } from "#webhooks/domain/webhook-event.ts";
import { originOf, parseWebhookUrl } from "#webhooks/domain/webhook-url.ts";
import type { WebhookUrl } from "#webhooks/domain/webhook-url.ts";

import { dispatch } from "./dispatch.ts";
import { EndpointDisabled } from "./endpoint-disabled.ts";
import { EndpointNotFound } from "./endpoint-not-found.ts";
import { FilterRefused } from "./filter-refused.ts";
import { HeaderValuesRequired } from "./header-values-required.ts";
import { HeadersRefused } from "./headers-refused.ts";
import { PartnerScopeUnavailable } from "./partner-scope-unavailable.ts";
import type { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { DeliveryStore } from "./ports/delivery-store.ts";
import { EndpointSecrets } from "./ports/endpoint-secrets.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";
import { EventOrigins } from "./ports/event-origins.ts";
import { ManualSends } from "./ports/manual-sends.ts";
import { WebhookTransport } from "./ports/webhook-transport.ts";
import { refusedSends } from "./refused-sends.ts";
import type { SecretsNotConfigured } from "./secrets-not-configured.ts";
import { TooManyEndpoints } from "./too-many-endpoints.ts";
import type { TooManyManualSends } from "./too-many-manual-sends.ts";
import type { UrlNotDeliverable } from "./url-not-deliverable.ts";

/**
 * A new endpoint, as a member asks for one: its address and its filters
 * not yet checked.
 */
export interface NewEndpoint extends Omit<
  EndpointSettings,
  "channelIds" | "headerNames" | "url" | "workspaceIds"
> {
  readonly channelIds?: readonly string[];
  /**
   * The headers its deliveries carry beside Peal's, values in the clear:
   * none when left out.
   */
  readonly headers?: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  /** What it hears: its workspace's events, unless `partner` says more. */
  readonly scope?: EndpointScope;
  readonly url: string;
  readonly workspaceIds?: readonly string[];
}

/**
 * What to change of an endpoint: what is left out stays. Its headers, when
 * given, are the whole list that replaces the one it had: a header without
 * a value keeps the value the endpoint has under that name.
 */
export type EndpointChange = Partial<Omit<NewEndpoint, "headers" | "scope">> & {
  readonly headers?: readonly {
    readonly name: string;
    readonly value?: string;
  }[];
};

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

/** The filters a member asked for, as an endpoint keeps them. */
interface EndpointFilters {
  channelIds?: readonly ChannelId[];
  workspaceIds?: readonly WorkspaceId[];
}

const decodeChannels = Schema.decodeUnknownEffect(ChannelFilterSchema);

const decodeWorkspaces = Schema.decodeUnknownEffect(WorkspaceFilterSchema);

const decodeHeaders = Schema.decodeUnknownEffect(EndpointHeadersSchema);

// The headers asked for, once they are headers an endpoint may carry.
const headersFrom = (
  asked: NonNullable<NewEndpoint["headers"]>
): Effect.Effect<EndpointHeaders, HeadersRefused> =>
  decodeHeaders(asked).pipe(Effect.mapError(() => new HeadersRefused()));

const decodeHeaderChanges = Schema.decodeUnknownEffect(HeaderChangesSchema);

// A change's headers, once they are headers an endpoint may carry.
const headerChangesFrom = (
  asked: NonNullable<EndpointChange["headers"]>
): Effect.Effect<readonly HeaderChange[], HeadersRefused> =>
  decodeHeaderChanges(asked).pipe(Effect.mapError(() => new HeadersRefused()));

// The filters as an endpoint of the scope keeps them, once each is a list
// of ids it may take: a list of workspaces only on one that hears more
// than its own.
const filtersFor = Effect.fn("WebhookEndpoints.filtersFor")(
  function* filtersFor(
    scope: EndpointScope,
    asked: {
      readonly channelIds: readonly string[] | undefined;
      readonly workspaceIds: readonly string[] | undefined;
    }
  ) {
    const channelIds =
      asked.channelIds === undefined
        ? undefined
        : yield* decodeChannels(asked.channelIds).pipe(
            Effect.mapError(() => new FilterRefused({ field: "channelIds" }))
          );

    if (
      asked.workspaceIds !== undefined &&
      asked.workspaceIds.length > 0 &&
      !takesWorkspaceFilter(scope)
    ) {
      return yield* new FilterRefused({ field: "workspaceIds" });
    }

    const workspaceIds =
      asked.workspaceIds === undefined
        ? undefined
        : yield* decodeWorkspaces(asked.workspaceIds).pipe(
            Effect.mapError(() => new FilterRefused({ field: "workspaceIds" }))
          );

    const filters: EndpointFilters = {};

    if (channelIds !== undefined) {
      filters.channelIds = channelIds;
    }

    if (workspaceIds !== undefined) {
      filters.workspaceIds = workspaceIds;
    }

    return filters;
  }
);

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
      | FilterRefused
      | HeadersRefused
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
      | DatabaseError
      | EndpointNotFound
      | FilterRefused
      | HeaderValuesRequired
      | HeadersRefused
      | MissingPermission
      | SecretsNotConfigured
      | UrlRefused
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
     * Sends the endpoint a `webhook.test` event, or, given a type, a
     * sample of that type (`sampleOf`, marked `sample`), whatever it
     * subscribes to or filters, and answers with its delivery, not yet
     * attempted.
     */
    readonly sendTest: (
      actor: Actor,
      endpointId: string,
      eventType?: SubscribableEventType
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

        const {
          channelIds,
          headers: askedHeaders = [],
          scope = "workspace",
          workspaceIds,
          ...settings
        } = asked;

        const filters = yield* filtersFor(scope, { channelIds, workspaceIds });
        const headers = yield* headersFrom(askedHeaders);

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
          {
            ...settings,
            ...filters,
            headerNames: headers.map(({ name }) => name),
            url,
          },
          yield* DateTime.now,
          scope
        );

        const issued = yield* secrets.issue(endpoint.id);
        const sealed = yield* secrets.sealHeaders(endpoint.id, url, headers);

        yield* store.addingTo(
          actor.workspaceId,
          Effect.gen(function* addWithinLimit() {
            const existing = yield* store.list(actor.workspaceId);

            yield* existing.length >= maxEndpointsPerWorkspace
              ? Effect.fail(
                  new TooManyEndpoints({ allowed: maxEndpointsPerWorkspace })
                )
              : store.insert(endpoint, issued.sealed, sealed);
          })
        );

        const created: EndpointWithSecret = { endpoint, secret: issued.secret };

        return created;
      }, Effect.provideContext(ports));

      // Each header of a change sealed for the address it goes to: its new
      // value, or the one the endpoint has under that name, whatever its
      // case, which is bound to the name in lowercase and to the origin,
      // which the caller made sure stays. One without a value it has not is
      // refused.
      const sealedChanges = Effect.fn("WebhookEndpoints.sealedChanges")(
        function* sealedChanges(
          endpointId: WebhookEndpointId,
          url: WebhookUrl,
          changes: readonly HeaderChange[]
        ) {
          const kept = Option.match(yield* store.secrets(endpointId), {
            onNone: () => [],
            onSome: ({ headers }) => headers,
          });

          return yield* Effect.all(
            changes.map(({ name, value }) => {
              if (value !== undefined) {
                return secrets
                  .sealHeaders(endpointId, url, [{ name, value }])
                  .pipe(
                    Effect.flatMap(([one]) =>
                      one === undefined
                        ? Effect.die("Nothing sealed")
                        : Effect.succeed(one)
                    )
                  );
              }

              const same = kept.find(
                (header) => header.name.toLowerCase() === name.toLowerCase()
              );

              return same === undefined
                ? Effect.fail(new HeadersRefused())
                : Effect.succeed<SealedHeader>({ name, sealed: same.sealed });
            })
          );
        }
      );

      const update = Effect.fn("WebhookEndpoints.update")(function* update(
        actor: Actor,
        endpointId: string,
        {
          channelIds,
          headers: askedHeaders,
          url,
          workspaceIds,
          ...change
        }: EndpointChange
      ) {
        yield* managing(actor);

        const current = yield* found(actor, endpointId);

        const filters = yield* filtersFor(current.scope, {
          channelIds,
          workspaceIds,
        });

        const changes =
          askedHeaders === undefined
            ? undefined
            : yield* headerChangesFrom(askedHeaders);

        const target =
          url === undefined ? current.url : yield* deliverable(url);

        // Moved to another origin, an endpoint keeps no header's value: each
        // is given again, or none is left.
        if (
          originOf(target) !== originOf(current.url) &&
          current.headerNames.length > 0 &&
          (changes === undefined ||
            changes.some(({ value }) => value === undefined))
        ) {
          return yield* new HeaderValuesRequired();
        }

        // Given, the headers replace those it had; left out, they stay.
        const sealed =
          changes === undefined
            ? Option.none<readonly SealedHeader[]>()
            : Option.some(yield* sealedChanges(current.id, target, changes));

        const named = Option.match(sealed, {
          onNone: () => ({}),
          onSome: (given) => ({ headerNames: given.map(({ name }) => name) }),
        });

        const changed = changeEndpoint(
          current,
          url === undefined
            ? { ...change, ...filters, ...named }
            : { ...change, ...filters, ...named, url: target },
          yield* DateTime.now
        );

        if (!(yield* store.update(changed, current, sealed))) {
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

        const removed = yield* store.remove(actor.workspaceId, id);

        yield* removed
          ? Effect.void
          : Effect.fail(new EndpointNotFound({ endpointId }));
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
        function* sendTest(
          actor: Actor,
          endpointId: string,
          eventType?: SubscribableEventType
        ) {
          yield* managing(actor);

          const endpoint = yield* found(actor, endpointId);

          if (endpoint.status._tag === "disabled") {
            return yield* new EndpointDisabled({ endpointId: endpoint.id });
          }

          const event: WebhookEvent =
            eventType === undefined
              ? {
                  data: {
                    endpointId: endpoint.id,
                    workspaceId: endpoint.workspaceId,
                  },
                  type: "webhook.test",
                }
              : sampleOf(eventType, endpoint.workspaceId);

          const recorded = new RecordedEvent({
            event,
            id: yield* newId(WebhookEventIdSchema),
            occurredAt: yield* DateTime.now,
            sample: eventType !== undefined,
            workspaceId: endpoint.workspaceId,
          });

          return yield* transaction(
            Effect.gen(function* sendWithinBudget() {
              yield* refusedSends(
                yield* manual.take(actor.workspaceId, "single", 1)
              );
              yield* deliveries.recordEvent(
                recorded,
                `webhook-test:${recorded.id}`
              );

              return yield* dispatch(endpoint, recorded);
            })
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
