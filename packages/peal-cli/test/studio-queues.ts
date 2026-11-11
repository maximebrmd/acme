import { DateTime, Effect, Option, Ref } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ChannelSetNotFound,
  Forbidden,
  InvalidTimeZone,
  maxQueuePreview,
  maxQueuesPerWorkspace,
  QueueNameTaken,
  QueueNotFound,
  TooManyQueues,
} from "peal-contract";
import type {
  CurrentMember,
  UnknownChannels,
  Queue,
  QueueDetails,
  QueuePreview,
  QueueSlot,
} from "peal-contract";

import type { Studio } from "./studio.ts";

// The studio's queues: weekly timetables a post is added to. Its slots
// are read in UTC whatever the zone, which is enough for the commands'
// tests: the server's own tests cover zones and daylight saving.

/** What the queues take of the studio, which hands it over. */
export interface StudioWorld {
  readonly allowed: (
    permission: "post:read" | "post:update"
  ) => Effect.Effect<unknown, Forbidden, CurrentMember>;
  readonly checkChannels: (
    channelIds: readonly string[]
  ) => Effect.Effect<void, UnknownChannels>;
  readonly isConnected: (channelId: string) => boolean;
  readonly now: DateTime.Utc;
  readonly record: (studio: Studio, change: string) => Effect.Effect<void>;
  readonly setIds: readonly string[];
  readonly workspaceId: string;
}

export const weekdaysQueueId = "0190f3a0-0000-7000-8000-00000000a301";

export const evergreenQueueId = "0190f3a0-0000-7000-8000-00000000a302";

/** A queue as the studio keeps it: which channels are gone is told. */
export type StudioQueue = Omit<Queue, "unavailableChannelIds">;

const at = (iso: string) => DateTime.makeUnsafe(iso);

// The queues the studio keeps, oldest first: its default, for a channel,
// and one with no slot yet.
export const studioQueues = (channelId: string): readonly StudioQueue[] => [
  {
    channelIds: [channelId],
    channelSetId: null,
    createdAt: at("2026-10-07T09:00:00Z"),
    id: weekdaysQueueId,
    isDefault: true,
    name: "Weekdays",
    slots: [
      { day: "monday", time: "09:00" },
      { day: "wednesday", time: "09:00" },
    ],
    timeZone: "UTC",
  },
  {
    channelIds: [],
    channelSetId: null,
    createdAt: at("2026-10-08T09:00:00Z"),
    id: evergreenQueueId,
    isDefault: false,
    name: "Evergreen",
    slots: [],
    timeZone: "UTC",
  },
];

const queueView =
  (world: StudioWorld) =>
  (queue: StudioQueue): Queue => ({
    ...queue,
    unavailableChannelIds: queue.channelIds.filter(
      (channelId) => !world.isConnected(channelId)
    ),
  });

// The default first, then by name.
const listed = (all: readonly StudioQueue[]) =>
  all.toSorted(
    (left, right) =>
      Number(right.isDefault) - Number(left.isDefault) ||
      left.name.toLowerCase().localeCompare(right.name.toLowerCase())
  );

const dayNumbers: Readonly<Record<QueueSlot["day"], number>> = {
  friday: 5,
  monday: 1,
  saturday: 6,
  sunday: 0,
  thursday: 4,
  tuesday: 2,
  wednesday: 3,
};

/** The queue's slots after `after`, read in UTC, `count` at most. */
export const slotsOf = (
  queue: StudioQueue,
  after: DateTime.Utc,
  count: number
): readonly DateTime.Utc[] => {
  const found: DateTime.Utc[] = [];

  if (queue.slots.length === 0) {
    return found;
  }

  const midnight = DateTime.startOf(after, "day");

  for (let day = 0; found.length < count; day += 1) {
    const date = DateTime.add(midnight, { days: day });
    const weekDay = DateTime.getPartUtc(date, "weekDay");

    const times = queue.slots
      .filter((slot) => dayNumbers[slot.day] === weekDay)
      .map(({ time }) => time)
      .toSorted();

    for (const time of times) {
      const instant = DateTime.add(date, {
        hours: Number(time.slice(0, 2)),
        minutes: Number(time.slice(3, 5)),
      });

      if (DateTime.isGreaterThan(instant, after) && found.length < count) {
        found.push(instant);
      }
    }
  }

  return found;
};

// The queue as saved, and the others no longer default if it is.
const saved = (
  all: readonly StudioQueue[],
  queue: StudioQueue
): readonly StudioQueue[] => {
  const others = all.map((found) =>
    queue.isDefault && found.id !== queue.id
      ? { ...found, isDefault: false }
      : found
  );

  return others.some(({ id }) => id === queue.id)
    ? others.map((found) => (found.id === queue.id ? queue : found))
    : [...others, queue];
};

const slotLine = (slots: readonly QueueSlot[]) =>
  slots.map(({ day, time }) => `${day}@${time}`).join(",");

/**
 * The studio's queues over what it hands them: finding them, the slot a
 * post added to one takes, and the queues group of the API.
 */
export const studioQueuesOf = (world: StudioWorld) => {
  const view = queueView(world);

  /** The queue a path names, in the studio's workspace. */
  const findQueue = (studio: Studio, workspaceId: string, queueId: string) =>
    Ref.get(studio.state).pipe(
      Effect.flatMap(({ queues }) =>
        Option.match(
          Option.fromUndefinedOr(
            workspaceId === world.workspaceId
              ? queues.find(({ id }) => id === queueId)
              : undefined
          ),
          {
            onNone: () => Effect.fail(new QueueNotFound()),
            onSome: Effect.succeed,
          }
        )
      )
    );

  /** The queue a post is added to: the one named, or the default. */
  const queueFor = (
    studio: Studio,
    workspaceId: string,
    queueId: string | undefined
  ) =>
    queueId === undefined
      ? Ref.get(studio.state).pipe(
          Effect.flatMap(({ queues }) =>
            Option.match(
              Option.fromUndefinedOr(queues.find(({ isDefault }) => isDefault)),
              {
                onNone: () => Effect.fail(new QueueNotFound()),
                onSome: Effect.succeed,
              }
            )
          )
        )
      : findQueue(studio, workspaceId, queueId);

  /** The first slot of the queue after now that no post of it holds. */
  const nextFreeOf = (studio: Studio, queue: StudioQueue, except?: string) =>
    Ref.get(studio.state).pipe(
      Effect.map(({ posts }) => {
        const held = new Set(
          posts.flatMap((post) =>
            post.queueId === queue.id &&
            post.id !== except &&
            post.schedule !== null &&
            ["scheduled", "awaitingApproval", "publishing"].includes(
              post.status
            )
              ? [DateTime.toEpochMillis(post.schedule.at)]
              : []
          )
        );

        return Option.fromUndefinedOr(
          slotsOf(queue, world.now, 4 * maxQueuePreview).find(
            (slot) => !held.has(DateTime.toEpochMillis(slot))
          )
        );
      })
    );

  // A queue as a request writes it, once it may be kept.
  const checkQueue = (studio: Studio, details: QueueDetails, but?: string) =>
    Effect.gen(function* checkingQueue() {
      yield* world.checkChannels(details.channelIds ?? []);

      if (/^[+-]/u.test(details.timeZone)) {
        yield* new InvalidTimeZone({ timeZone: details.timeZone });
      }

      if (
        details.channelSetId !== undefined &&
        !world.setIds.includes(details.channelSetId)
      ) {
        yield* new ChannelSetNotFound();
      }

      const { queues } = yield* Ref.get(studio.state);

      if (
        queues.some(
          (queue) =>
            queue.id !== but &&
            queue.name.toLowerCase() === details.name.toLowerCase()
        )
      ) {
        yield* new QueueNameTaken();
      }
    });

  const groupLive = (studio: Studio) =>
    HttpApiBuilder.group(Api, "queues", (handlers) =>
      handlers.handleAll({
        create: ({ params, payload }) =>
          Effect.gen(function* create() {
            yield* world.allowed("post:update");

            if (params.workspaceId !== world.workspaceId) {
              return yield* new Forbidden();
            }

            yield* checkQueue(studio, payload);

            const { changes, queues } = yield* Ref.get(studio.state);

            if (queues.length >= maxQueuesPerWorkspace) {
              return yield* new TooManyQueues({
                allowed: maxQueuesPerWorkspace,
              });
            }

            // An id no queue had, deleted ones included.
            const made =
              changes.filter((change) => change.startsWith("queue:create:"))
                .length +
              studioQueues("").length +
              1;

            const queue: StudioQueue = {
              channelIds: payload.channelIds ?? [],
              channelSetId: payload.channelSetId ?? null,
              createdAt: world.now,
              id: `0190f3a0-0000-7000-8000-00000000a3${String(made).padStart(2, "0")}`,
              isDefault: payload.isDefault === true || queues.length === 0,
              name: payload.name,
              slots: payload.slots,
              timeZone: payload.timeZone,
            };

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              queues: saved(current.queues, queue),
            }));
            yield* world.record(
              studio,
              `queue:create:${queue.name}:${queue.timeZone}:${slotLine(queue.slots)}:${queue.channelIds.join(",")}:${queue.isDefault ? "default" : "plain"}`
            );

            return view(queue);
          }),
        delete: ({ params }) =>
          Effect.gen(function* remove() {
            yield* world.allowed("post:update");

            const queue = yield* findQueue(
              studio,
              params.workspaceId,
              params.queueId
            );

            yield* Ref.update(studio.state, (current) => ({
              ...current,
              // Its posts stay where they are, without it.
              posts: current.posts.map((post) =>
                post.queueId === queue.id ? { ...post, queueId: null } : post
              ),
              queues: current.queues.filter(({ id }) => id !== queue.id),
            }));
            yield* world.record(studio, `queue:delete:${queue.id}`);
          }),
        get: ({ params }) =>
          world
            .allowed("post:read")
            .pipe(
              Effect.andThen(
                findQueue(studio, params.workspaceId, params.queueId)
              ),
              Effect.map(view)
            ),
        list: ({ params }) =>
          world.allowed("post:read").pipe(
            Effect.andThen(Ref.get(studio.state)),
            Effect.map(({ queues }) =>
              params.workspaceId === world.workspaceId
                ? listed(queues).map(view)
                : []
            )
          ),
        slots: ({ params, query }) =>
          Effect.gen(function* slots() {
            yield* world.allowed("post:read");

            const queue = yield* findQueue(
              studio,
              params.workspaceId,
              params.queueId
            );

            const { posts } = yield* Ref.get(studio.state);
            const nextFree = yield* nextFreeOf(studio, queue);

            const preview: QueuePreview = {
              nextFree: Option.getOrNull(nextFree),
              noRoom: queue.slots.length === 0 ? "noSlots" : null,
              slots: slotsOf(queue, world.now, query.count ?? 10).map(
                (slot) => ({
                  at: slot,
                  postId:
                    posts.find(
                      (post) =>
                        post.queueId === queue.id &&
                        post.schedule !== null &&
                        DateTime.toEpochMillis(post.schedule.at) ===
                          DateTime.toEpochMillis(slot)
                    )?.id ?? null,
                })
              ),
            };

            return preview;
          }),
        update: ({ params, payload }) =>
          Effect.gen(function* update() {
            yield* world.allowed("post:update");

            const current = yield* findQueue(
              studio,
              params.workspaceId,
              params.queueId
            );

            yield* checkQueue(studio, payload, current.id);

            const queue: StudioQueue = {
              ...current,
              channelIds: payload.channelIds ?? [],
              channelSetId: payload.channelSetId ?? null,
              isDefault: payload.isDefault === true,
              name: payload.name,
              slots: payload.slots,
              timeZone: payload.timeZone,
            };

            yield* Ref.update(studio.state, (state) => ({
              ...state,
              queues: saved(state.queues, queue),
            }));
            yield* world.record(
              studio,
              `queue:update:${queue.id}:${queue.name}:${queue.timeZone}:${slotLine(queue.slots)}:${queue.channelIds.join(",")}:${queue.isDefault ? "default" : "plain"}`
            );

            return view(queue);
          }),
      })
    );

  return { findQueue, groupLive, nextFreeOf, queueFor };
};
