import { Option, Result, Schema } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import type { UserId } from "#shared/domain/ids.ts";

/**
 * Only a member in person may do this: signed in themselves, not through
 * an API key or an OAuth client, and not staff acting as them.
 */
export class PersonRequired extends Schema.TaggedError<PersonRequired>()(
  "PersonRequired",
  {}
) {}

/** The member, when the actor is them in person. */
export const inPerson = (actor: Actor): Result.Result<UserId, PersonRequired> =>
  actor.subject._tag === "user" &&
  actor.subject.clientId === undefined &&
  Option.isNone(actor.subject.impersonatedBy)
    ? Result.succeed(actor.subject.userId)
    : Result.fail(new PersonRequired());
