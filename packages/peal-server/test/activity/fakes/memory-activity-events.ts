import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { ActivityEvents } from "#activity/application/activity-events.ts";
import { ActivityEvent } from "#activity/domain/activity-event.ts";

const actorIdOf = ({ actor }: ActivityEvent): Option.Option<string> =>
  actor._tag === "apiKey" ? Option.some(actor.apiKeyId) : actor.userId;

// A filter that is not asked for lets everything through.
const unless = <A>(asked: Option.Option<A>, keeps: (value: A) => boolean) =>
  Option.match(asked, { onNone: () => true, onSome: keeps });

// Newest first: ids are UUIDv7s, issued in order.
const newestFirst = (one: ActivityEvent, other: ActivityEvent) =>
  other.id.localeCompare(one.id);

/** The activity logs in memory, as the Postgres store keeps them. */
export const MemoryActivityEvents = Layer.effect(
  ActivityEvents,
  Effect.gen(function* MemoryActivityEvents() {
    const kept = yield* Ref.make<readonly ActivityEvent[]>([]);

    return ActivityEvents.of({
      eraseWorkspace: (workspaceId) =>
        Ref.update(kept, (events) =>
          events.filter((event) => event.workspaceId !== workspaceId)
        ),
      forgetUser: (userId) =>
        Ref.update(kept, (events) =>
          events.map((event) => {
            const { actor } = event;

            const made =
              actor._tag === "user" && Option.contains(actor.userId, userId);

            return new ActivityEvent({
              actor: made ? { _tag: "user", userId: Option.none() } : actor,
              application: made ? Option.none() : event.application,
              errorCode: event.errorCode,
              id: event.id,
              impersonated: event.impersonated,
              objectIds: Object.fromEntries(
                Object.entries(event.objectIds).filter(
                  ([, value]) => value !== userId
                )
              ),
              occurredAt: event.occurredAt,
              operation: event.operation,
              requestId: event.requestId,
              status: event.status,
              via: event.via,
              workspaceId: event.workspaceId,
            });
          })
        ),
      insert: (event) => Ref.update(kept, (events) => [...events, event]),
      madeBy: (userId) =>
        Ref.get(kept).pipe(
          Effect.map((events) =>
            events
              .filter(
                ({ actor }) =>
                  actor._tag === "user" && Option.contains(actor.userId, userId)
              )
              .toSorted((one, other) => one.id.localeCompare(other.id))
          )
        ),
      page: (workspaceId, { actorId, after, limit, operation }) =>
        Ref.get(kept).pipe(
          Effect.map((events) => {
            const matching = events
              .filter(
                (event) =>
                  event.workspaceId === workspaceId &&
                  unless(after, (id) => event.id < id) &&
                  unless(operation, (name) => event.operation === name) &&
                  unless(actorId, (id) => Option.contains(actorIdOf(event), id))
              )
              .toSorted(newestFirst);

            const items = matching.slice(0, limit);
            const last = items.at(-1);

            return {
              items,
              next:
                matching.length > limit && last !== undefined
                  ? Option.some(last.id)
                  : Option.none(),
            };
          })
        ),
      purge: (before, limit) =>
        Ref.modify(kept, (events) => {
          const expired = new Set(
            events
              .filter((event) => DateTime.isLessThan(event.occurredAt, before))
              .slice(0, limit)
              .map(({ id }) => id)
          );

          return [expired.size, events.filter(({ id }) => !expired.has(id))];
        }),
    });
  })
);
