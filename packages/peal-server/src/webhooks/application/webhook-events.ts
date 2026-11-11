import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { hearsPartner, wants } from "#webhooks/domain/webhook-endpoint.ts";
import type { EventReach } from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { channelsOf } from "#webhooks/domain/webhook-event.ts";
import type {
  PostWideEventType,
  WebhookEvent,
} from "#webhooks/domain/webhook-event.ts";

import { dispatch } from "./dispatch.ts";
import type { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { DeliveryStore } from "./ports/delivery-store.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";
import { EventOrigins } from "./ports/event-origins.ts";

type PostWideEvent = Extract<
  WebhookEvent,
  { readonly type: PostWideEventType }
>;

/** An event that names the channels it concerns, or concerns none. */
export type ChannelNamingEvent = Exclude<WebhookEvent, PostWideEvent>;

interface Told {
  /**
   * Names what happened, such as `post-target:<id>:<round>:published`: an
   * event whose key was published before is not sent again. Ids and
   * instants only, never content.
   */
  readonly key: string;
}

/**
 * Something that happened in a workspace, for its endpoints to hear. An
 * event about a whole post whose data names none of its channels comes
 * with them (`postChannelIds`), for the endpoints that listen to some
 * channels only; it is sent as it is, without them.
 */
export type EventToPublish =
  | (Told & { readonly event: ChannelNamingEvent })
  | (Told & {
      readonly event: PostWideEvent;
      readonly postChannelIds: readonly ChannelId[];
    });

// What the endpoints' filters read of the event.
const reachOf = (request: EventToPublish): EventReach => {
  const channels = channelsOf(request.event);

  const about = {
    type: request.event.type,
    workspaceId: request.event.data.workspaceId,
  };

  if (channels._tag === "none") {
    return { ...about, channelIds: Option.none() };
  }

  if (channels._tag === "named") {
    return { ...about, channelIds: Option.some(channels.channelIds) };
  }

  return {
    ...about,
    channelIds: Option.some(
      "postChannelIds" in request ? request.postChannelIds : []
    ),
  };
};

/**
 * Sends an event to the endpoints of its workspace that are on, subscribe
 * to its type and listen to its workspace and one of its channels, as
 * they stand now (`wants`): one delivery each, once per key. An event of a
 * workspace a partner owns goes to the partner's endpoints too, those of
 * the `partner` scope in its home workspace, and carries the partner's own
 * id for the workspace (`EventOrigins`).
 *
 * It runs in one transaction, joining the caller's: the event, its
 * deliveries and the start of their jobs commit with the fact they tell,
 * or not at all, and then a call again does it all again. The requests go
 * out after the commit. A workspace without such an endpoint keeps nothing.
 */
export class WebhookEvents extends Context.Service<
  WebhookEvents,
  {
    readonly publish: (
      request: EventToPublish
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/webhooks/application/WebhookEvents") {
  static readonly layer = Layer.effect(
    WebhookEvents,
    Effect.gen(function* WebhookEventsLive() {
      const endpoints = yield* EndpointStore;
      const deliveries = yield* DeliveryStore;
      const origins = yield* EventOrigins;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<DeliveryJobs | DeliveryStore | Ids>();

      const publishOnce = Effect.fn("WebhookEvents.publishOnce")(
        function* publishOnce(request: EventToPublish) {
          const { event, key } = request;
          const { workspaceId } = event.data;

          const origin = yield* origins.of(workspaceId);

          const own = yield* endpoints.list(workspaceId);

          const partners = Option.isSome(origin)
            ? (yield* endpoints.list(origin.value.homeWorkspaceId)).filter(
                hearsPartner
              )
            : [];

          const reach = reachOf(request);

          const listening = [...own, ...partners].filter((endpoint) =>
            wants(endpoint, reach)
          );

          if (listening.length === 0) {
            return;
          }

          const recorded = new RecordedEvent({
            event,
            externalId: origin.pipe(
              Option.flatMap(({ externalId }) => externalId)
            ),
            id: yield* newId(WebhookEventIdSchema),
            occurredAt: yield* DateTime.now,
            workspaceId,
          });

          if (!(yield* deliveries.recordEvent(recorded, key))) {
            return;
          }

          yield* Effect.forEach(
            listening,
            (endpoint) => dispatch(endpoint, recorded),
            { discard: true }
          );
        },
        Effect.provideContext(ports)
      );

      return WebhookEvents.of({
        publish: (request) =>
          transaction(publishOnce(request)).pipe(
            Effect.annotateLogs({ webhookEvent: request.event.type })
          ),
      });
    })
  );
}
