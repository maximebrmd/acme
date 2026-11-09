import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/**
 * What the audit log keeps about a user, for the workspace context when
 * their account is closed. It runs in the caller's transaction, if any.
 */
export class StaffRecords extends Context.Service<
  StaffRecords,
  {
    /**
     * Forgets the user in the audit log: events about them lose its id and
     * the reason given, events they made as staff lose their id. What was
     * done, and when, stays.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/staff/application/StaffRecords") {}
