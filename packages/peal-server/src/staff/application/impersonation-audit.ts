import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import {
  AuditOperationSchema,
  objectIdsOf,
} from "#staff/domain/audit-operation.ts";
import type { StaffAction } from "#staff/domain/staff-action.ts";

import { AuditLog } from "./ports/audit-log.ts";

/** A staff member acting as an account. */
export interface Impersonation {
  readonly staffId: UserId;
  /** The account they act as. */
  readonly userId: UserId;
}

/** A change staff asked for while acting as an account. */
export interface ImpersonatedChange extends Impersonation {
  /** The ids the request named, by name; those not shaped like ids are left out. */
  readonly objectIds: Readonly<Record<string, string | undefined>>;
  /** The endpoint (`group.endpoint`) or sign-in route (`auth:/path`). */
  readonly operation: string;
  readonly workspaceId: Option.Option<WorkspaceId>;
}

// Operations are names the server's own code gives: one that is not is a bug.
const decodeOperation = Schema.decodeUnknownEffect(AuditOperationSchema);

/**
 * What staff do while acting as an account, for the workspace context,
 * which sees each request: every change they ask for, recorded before it is
 * carried out, and the end of the impersonation. The record names the staff
 * member behind it, though what they made is under the account's name.
 */
export class ImpersonationAudit extends Context.Service<
  ImpersonationAudit,
  {
    readonly changed: (
      change: ImpersonatedChange
    ) => Effect.Effect<void, DatabaseError>;
    /** Staff stopped acting as the account, through `operation`. */
    readonly stopped: (
      impersonation: Impersonation & { readonly operation: string }
    ) => Effect.Effect<void, DatabaseError>;
    /** The server ended a session staff acted as the account in. */
    readonly ended: (
      impersonation: Impersonation
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/staff/application/ImpersonationAudit") {
  static readonly layer = Layer.effect(
    ImpersonationAudit,
    Effect.gen(function* ImpersonationAuditLive() {
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const record = Effect.fn("ImpersonationAudit.record")(function* record(
        action: StaffAction,
        { staffId, userId }: Impersonation,
        details: {
          readonly objectIds?: Readonly<Record<string, string | undefined>>;
          readonly operation?: string;
          readonly workspaceId?: Option.Option<WorkspaceId>;
        }
      ): Effect.fn.Return<void, DatabaseError, Ids> {
        const operation =
          details.operation === undefined
            ? Option.none()
            : Option.some(
                yield* decodeOperation(details.operation).pipe(Effect.orDie)
              );

        yield* log.record(
          new AuditEvent({
            action,
            at: yield* DateTime.now,
            banExpiresAt: Option.none(),
            id: yield* newId(AuditEventIdSchema),
            objectIds: objectIdsOf(details.objectIds ?? {}),
            operation,
            reason: Option.none(),
            staffId: Option.some(staffId),
            targetId: Option.some(userId),
            workspaceId: details.workspaceId ?? Option.none(),
          })
        );
      });

      const recorded = (
        action: StaffAction,
        impersonation: Impersonation,
        details: Parameters<typeof record>[2]
      ) =>
        record(action, impersonation, details).pipe(
          Effect.provideContext(ports),
          Effect.annotateLogs({
            action,
            staffId: impersonation.staffId,
            targetId: impersonation.userId,
          })
        );

      return ImpersonationAudit.of({
        changed: ({ objectIds, operation, workspaceId, ...impersonation }) =>
          recorded("impersonatedChange", impersonation, {
            objectIds,
            operation,
            workspaceId,
          }),
        ended: (impersonation) =>
          recorded("impersonationEnded", impersonation, {}),
        stopped: ({ operation, ...impersonation }) =>
          recorded("stopImpersonating", impersonation, { operation }),
      });
    })
  );
}
