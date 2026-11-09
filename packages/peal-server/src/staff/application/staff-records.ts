import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { StaffActionRecord } from "#shared/application/personal-data.ts";
import type { UserId } from "#shared/domain/ids.ts";

/**
 * What the audit log keeps about a user, for the workspace context when
 * they copy out their data or close their account. Erasing runs in the
 * caller's transaction, if any.
 */
export class StaffRecords extends Context.Service<
  StaffRecords,
  {
    /** What staff did to the user's account, oldest first. */
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<readonly StaffActionRecord[], DatabaseError>;
    /**
     * Forgets the user in the audit log: events about them lose its id and
     * the reason given. Events they made as staff keep their id, as a
     * legitimate interest: the server's operator answers for what staff did
     * to other people's accounts, after staff leave too. What was done, and
     * when, stays.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/staff/application/StaffRecords") {}
