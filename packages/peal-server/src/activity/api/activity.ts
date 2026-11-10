import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import { Api, CurrentMember, defaultActivityPageSize } from "peal-contract";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { ActivityEventIdSchema } from "#activity/domain/activity-event-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { toEventView } from "./activity-view.ts";

const decodeCursor = Schema.decodeUnknownOption(ActivityEventIdSchema);

// A failure of the server's own (the database, a bug) is a defect: 500.
export const ActivityHandlers = HttpApiBuilder.group(
  Api,
  "activity",
  Effect.fn(function* activityHandlers(handlers) {
    const log = yield* ActivityLog;

    return handlers.handle("list", ({ query }) =>
      Effect.gen(function* list() {
        const actor = actorOf(yield* CurrentMember);

        // A cursor is the id of the last event of the page before.
        const after = Option.fromUndefinedOr(query.cursor).pipe(
          Option.map(decodeCursor)
        );

        if (Option.isSome(after) && Option.isNone(after.value)) {
          return yield* new HttpApiError.BadRequest();
        }

        const page = yield* log
          .list(actor, {
            actorId: Option.fromUndefinedOr(query.actor),
            after: Option.flatten(after),
            limit: query.limit ?? defaultActivityPageSize,
            operation: Option.fromUndefinedOr(query.operation),
          })
          .pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

        return {
          items: page.items.map(toEventView),
          nextCursor: Option.getOrNull(page.next),
        };
      })
    );
  })
);
