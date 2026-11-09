import { Option, Result } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { PersonRequired } from "./person-required.ts";

/**
 * The member, when the actor is them in person: not an API key, nor staff
 * impersonating them. (OAuth clients are refused before, by the API.)
 */
export const inPerson = (actor: Actor): Result.Result<UserId, PersonRequired> =>
  actor.subject._tag === "user" && Option.isNone(actor.subject.impersonatedBy)
    ? Result.succeed(actor.subject.userId)
    : Result.fail(new PersonRequired());
