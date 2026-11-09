import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type { AuditEvent } from "#staff/domain/audit-event.ts";

import type { Slice } from "./staff-directory.ts";

/** What staff did, kept for good, newest first. */
export class AuditLog extends Context.Service<
  AuditLog,
  {
    readonly record: (event: AuditEvent) => Effect.Effect<void, DatabaseError>;
    /** A slice of the log, of what was done to one account if given. */
    readonly read: (request: {
      readonly limit: number;
      readonly offset: number;
      readonly targetId: Option.Option<UserId>;
    }) => Effect.Effect<Slice<AuditEvent>, DatabaseError>;
  }
>()("acme-server/staff/application/AuditLog") {}
