import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/**
 * Whether a user may still use Acme: an account deleted, or banned, since
 * their session was cached has no inbox to read.
 */
export class ReaderStanding extends Context.Service<
  ReaderStanding,
  {
    readonly isActive: (
      userId: UserId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("acme-server/notifications/application/ReaderStanding") {}
