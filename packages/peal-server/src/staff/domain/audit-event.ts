import { Effect, Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { AuditEventIdSchema } from "./audit-event-id.ts";
import { AuditOperationSchema, ObjectIdsSchema } from "./audit-operation.ts";
import { StaffActionSchema } from "./staff-action.ts";
import { StaffReasonSchema } from "./staff-reason.ts";

/**
 * Something staff did, recorded before it was carried out: who, what, to
 * which account, why and when; for a change made while acting as the
 * account, the operation, its workspace and the ids it named. Ids only,
 * never what anyone wrote. Once an account is closed, its id is forgotten
 * from the log, and so is the reason given about it; the action and its
 * time stay.
 */
export class AuditEvent extends Schema.Class<AuditEvent>(
  "peal-server/staff/domain/AuditEvent"
)({
  action: StaffActionSchema,
  at: Schema.DateTimeUtc,
  // When a ban was to end; none for any other action, or a ban for good.
  banExpiresAt: Schema.Option(Schema.DateTimeUtc),
  id: AuditEventIdSchema,
  // The ids a change made while acting as the account named.
  objectIds: ObjectIdsSchema.pipe(
    Schema.withConstructorDefault(Effect.succeed({}))
  ),
  // What staff asked for while acting as the account, or stopped it with.
  operation: Schema.Option(AuditOperationSchema).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
  reason: Schema.Option(StaffReasonSchema),
  staffId: Schema.Option(UserIdSchema),
  targetId: Schema.Option(UserIdSchema),
  // The workspace a change made while acting as the account was in.
  workspaceId: Schema.Option(WorkspaceIdSchema).pipe(
    Schema.withConstructorDefault(Effect.succeedNone)
  ),
}) {}
