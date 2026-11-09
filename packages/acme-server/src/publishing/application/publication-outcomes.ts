import { Context } from "effect";
import type { Effect } from "effect";

import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Hears how the publication of a post on a channel ended: published,
 * failed or unconfirmed (a cancelled target says nothing). Publishing calls
 * it once per target and round, in the transaction that settles the target,
 * so what it records commits with the settlement or not at all.
 */
export class PublicationOutcomes extends Context.Service<
  PublicationOutcomes,
  {
    readonly settled: (
      target: PostTarget
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * A member dealt with the round `target` ended in: they said whether an
     * unconfirmed post went out, or sent the target again. What asked them
     * to check it no longer needs anyone. Called in the transaction that
     * changes the target, with the target as it was.
     */
    readonly resolved: (
      target: PostTarget
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/publishing/application/PublicationOutcomes") {}
