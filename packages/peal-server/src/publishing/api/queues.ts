import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ChannelSetNotFound,
  CurrentMember,
  InvalidTimeZone,
  QueueHasNoRoom,
  QueueNameTaken,
  QueueNotFound,
  TooManyQueues,
  UnknownChannels,
} from "peal-contract";
import type {
  QueueDetails as DetailsInput,
  QueueSlot as SlotInput,
} from "peal-contract";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { QueueReshuffle } from "#publishing/application/post-scheduling.ts";
import { Queues } from "#publishing/application/queues.ts";
import { ChannelSetIdSchema } from "#publishing/domain/channel-set-id.ts";
import { QueueIdSchema } from "#publishing/domain/queue-id.ts";
import { defaultQueuePreview } from "#publishing/domain/queue.ts";
import type { QueueDetails, QueueSlot } from "#publishing/domain/queue.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { channelIdsFrom } from "./post-input.ts";
import { previewView, queueView } from "./queue-view.ts";

const decodeQueueId = Schema.decodeUnknownOption(QueueIdSchema);

const decodeSetId = Schema.decodeUnknownOption(ChannelSetIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const notFound = () => Effect.fail(new QueueNotFound());

const nameTaken = () => Effect.fail(new QueueNameTaken());

const setNotFound = () => Effect.fail(new ChannelSetNotFound());

const unknownChannels = ({
  channelIds,
}: {
  readonly channelIds: readonly string[];
}) => Effect.fail(new UnknownChannels({ channelIds }));

/** The queue an id names, if it is a queue id at all. */
export const queueIdOption = (raw: string) => decodeQueueId(raw);

/** The queue a path names, or QueueNotFound. */
export const queueIdFrom = (raw: string) =>
  Option.match(decodeQueueId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

/** A slot as the contract writes it, `HH:mm` read as a time of day. */
export const slotFrom = ({ day, time }: SlotInput): QueueSlot => ({
  day,
  time: { hour: Number(time.slice(0, 2)), minute: Number(time.slice(3, 5)) },
});

/** A queue as a request writes it, with its ids and zone decoded. */
export const queueDetailsFrom = ({
  channelIds = [],
  channelSetId,
  isDefault = false,
  name,
  slots,
  timeZone,
}: DetailsInput) =>
  Effect.gen(function* decodingQueue() {
    const zone = yield* Option.match(decodeTimeZone(timeZone), {
      onNone: () => Effect.fail(new InvalidTimeZone({ timeZone })),
      onSome: Effect.succeed,
    });

    const details: QueueDetails = {
      channelIds: yield* channelIdsFrom(channelIds),
      channelSetId:
        channelSetId === undefined
          ? Option.none()
          : Option.some(
              yield* Option.match(decodeSetId(channelSetId), {
                onNone: setNotFound,
                onSome: Effect.succeed,
              })
            ),
      isDefault,
      name,
      slots: slots.map(slotFrom),
      timeZone: zone,
    };

    return details;
  });

// What a reshuffle did, as the contract writes it.
const reshuffleView = ({
  moved,
  remaining,
  stoppedBy,
  unchanged,
}: QueueReshuffle) => ({
  moved,
  remaining,
  stoppedBy: Option.getOrNull(stoppedBy),
  unchanged,
});

// A failure of the server's own (the database, a bug) is a defect: 500.
export const QueuesHandlers = HttpApiBuilder.group(
  Api,
  "queues",
  Effect.fn(function* queuesHandlers(handlers) {
    const queues = yield* Queues;
    const scheduling = yield* PostScheduling;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);
          const details = yield* queueDetailsFrom(payload);

          return yield* queues.create(actor, details).pipe(
            Effect.map(queueView),
            Effect.catchTags({
              ChannelSetNotFound: setNotFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              QueueNameTaken: nameTaken,
              TooManyQueues: ({ allowed }) =>
                Effect.fail(new TooManyQueues({ allowed })),
              UnknownChannels: unknownChannels,
            })
          );
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);
          const queueId = yield* queueIdFrom(params.queueId);

          yield* queues.remove(actor, queueId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              QueueNotFound: notFound,
            })
          );
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);
          const queueId = yield* queueIdFrom(params.queueId);

          return yield* queues.get(actor, queueId).pipe(
            Effect.map(queueView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              QueueNotFound: notFound,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          return yield* queues.list(actor).pipe(
            Effect.map((all) => all.map(queueView)),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      reshuffle: ({ params }) =>
        Effect.gen(function* reshuffle() {
          const actor = actorOf(yield* CurrentMember);
          const queueId = yield* queueIdFrom(params.queueId);

          return yield* scheduling.reshuffle(actor, queueId).pipe(
            Effect.map(reshuffleView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              QueueHasNoRoom: ({ reason }) =>
                Effect.fail(
                  new QueueHasNoRoom({ queueId: params.queueId, reason })
                ),
              QueueNotFound: notFound,
            })
          );
        }),
      slots: ({ params, query }) =>
        Effect.gen(function* slots() {
          const actor = actorOf(yield* CurrentMember);
          const queueId = yield* queueIdFrom(params.queueId);

          return yield* queues
            .preview(actor, queueId, query.count ?? defaultQueuePreview)
            .pipe(
              Effect.map(previewView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                QueueNotFound: notFound,
              })
            );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const queueId = yield* queueIdFrom(params.queueId);
          const details = yield* queueDetailsFrom(payload);

          return yield* queues.update(actor, queueId, details).pipe(
            Effect.map(queueView),
            Effect.catchTags({
              ChannelSetNotFound: setNotFound,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              QueueNameTaken: nameTaken,
              QueueNotFound: notFound,
              UnknownChannels: unknownChannels,
            })
          );
        }),
    });
  })
);
