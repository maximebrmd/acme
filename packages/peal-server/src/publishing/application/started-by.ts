import { Effect, Option } from "effect";

import { isSameOrigin, originOf } from "#publishing/domain/post-origin.ts";
import type { PostOrigin } from "#publishing/domain/post-origin.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

/** What keeps who started it, and acts as them later: a rule, a feed. */
export interface Started {
  readonly startedBy: Option.Option<UserId>;
  readonly startedVia: PostOrigin;
}

/** Who started it, as the actor is: the member, or none for a key. */
export const starterOf = (actor: Actor): Option.Option<UserId> =>
  actor.subject._tag === "user"
    ? Option.some(actor.subject.userId)
    : Option.none();

/**
 * Refuses staff acting as a member: what is started acts later as the
 * member, who never chose it.
 */
export const notImpersonating = (actor: Actor) =>
  actor.subject._tag === "user" && Option.isSome(actor.subject.impersonatedBy)
    ? Effect.fail(new MissingPermission({ permission: "post:schedule" }))
    : Effect.void;

/**
 * Whether `actor` may change what someone started: those who may
 * schedule change any; its starter changes their own while they may
 * still start it (`mayStart`), and only from where they started it (the
 * web, the same application, the same key), so a member's application
 * never rewrites what goes out in their name from the web, nor the other
 * way round. Answers true, or fails with MissingPermission.
 */
export const mayChangeStarted = Effect.fn("Publishing.mayChangeStarted")(
  function* mayChangeStarted<E, R>(
    actor: Actor,
    started: Started,
    mayStart: Effect.Effect<void, E, R>
  ) {
    if (can(actor, "post:schedule")) {
      return true;
    }

    yield* mayStart;

    const sameOrigin = isSameOrigin(
      originOf(actor, Option.none()),
      started.startedVia
    );

    const sameStarter =
      actor.subject._tag === "user"
        ? Option.contains(started.startedBy, actor.subject.userId)
        : Option.isNone(started.startedBy);

    if (!(sameOrigin && sameStarter)) {
      return yield* new MissingPermission({ permission: "post:schedule" });
    }

    return true;
  }
);
