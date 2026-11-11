import { Effect, Option } from "effect";

import { refuse } from "#app/mcp/refusals.ts";
import type { ListedQueue, Queues } from "#publishing/application/queues.ts";
import { queueKeyOf } from "#publishing/domain/queue.ts";
import type { Actor } from "#shared/domain/access.ts";

import { notAllowed } from "./refusals.ts";

/**
 * The queue a tool names, by its id or its name whatever its case, or the
 * workspace's default when it names none; a refusal the user can act on
 * otherwise.
 */
export const queueReferenced = Effect.fn("mcp.queueReferenced")(
  function* queueReferenced(
    queues: Queues["Service"],
    actor: Actor,
    reference: string | undefined
  ) {
    const kept = yield* queues.list(actor).pipe(
      Effect.catchTags({
        DatabaseError: Effect.die,
        MissingPermission: notAllowed("read queues"),
      })
    );

    const wanted = reference?.trim();

    const found = Option.fromUndefinedOr(
      wanted === undefined || wanted === ""
        ? kept.find(({ queue }) => queue.isDefault)
        : (kept.find(({ queue }) => queue.id === wanted) ??
            kept.find(
              ({ queue }) => queueKeyOf(queue.name) === queueKeyOf(wanted)
            ))
    );

    if (Option.isNone(found)) {
      return yield* refuse(
        wanted === undefined || wanted === ""
          ? "The workspace has no default queue: name a queue (list_queues answers them), or make one the default with update_queue. Nothing was made or moved."
          : `The workspace has no queue ${wanted}, by id or by name: list_queues answers its queues. Nothing was made or moved.`
      );
    }

    const listed: ListedQueue = found.value;

    return listed;
  }
);
