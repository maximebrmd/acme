import { Context, Effect, Layer, Option, Schema } from "effect";
import type { DateTime } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import { objectIdsOf } from "#staff/domain/audit-operation.ts";
import {
  maxReasonLength,
  StaffReasonSchema,
} from "#staff/domain/staff-reason.ts";

import { AuditLog } from "./ports/audit-log.ts";

/** What a staff member did with a request to cancel or withdraw. */
export interface HandledContractRequest {
  readonly action: "applyContractRequest" | "closeContractRequest";
  readonly at: DateTime.Utc;
  readonly reason: string;
  readonly requestId: string;
  readonly staffId: UserId;
  /** The account the request's address signs in to, if any. */
  readonly userId: Option.Option<UserId>;
  /** The workspace whose contract it was applied to. */
  readonly workspaceId: Option.Option<WorkspaceId>;
}

const decodeReason = Schema.decodeUnknownOption(StaffReasonSchema);

/**
 * Each request to cancel a contract or withdraw from one that staff apply
 * or close, for the billing context, in the staff audit log: the request's
 * id, the workspace it was applied to, the account its address signs in to
 * and the reason staff gave. Never the name or the address it held.
 */
export class ContractRequestAudit extends Context.Service<
  ContractRequestAudit,
  {
    readonly handled: (
      handled: HandledContractRequest
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/staff/application/ContractRequestAudit") {
  static readonly layer = Layer.effect(
    ContractRequestAudit,
    Effect.gen(function* ContractRequestAuditLive() {
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const handled = Effect.fn("ContractRequestAudit.handled")(
        function* handled(entry: HandledContractRequest) {
          yield* log.record(
            new AuditEvent({
              action: entry.action,
              at: entry.at,
              banExpiresAt: Option.none(),
              id: yield* newId(AuditEventIdSchema),
              objectIds: objectIdsOf({ requestId: entry.requestId }),
              reason: decodeReason(entry.reason.slice(0, maxReasonLength)),
              staffId: Option.some(entry.staffId),
              targetId: entry.userId,
              workspaceId: entry.workspaceId,
            })
          );
        },
        Effect.provideContext(ports)
      );

      return ContractRequestAudit.of({ handled });
    })
  );
}
