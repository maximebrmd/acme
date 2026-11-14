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

/** A credit or refund Stripe did not give, that staff settled by hand. */
export interface SettledCreditProblem {
  readonly at: DateTime.Utc;
  readonly reason: string;
  /** The refund Stripe reported failed, if it was one. */
  readonly refundId: Option.Option<string>;
  readonly staffId: UserId;
  /** The subscription whose credit Stripe refused, if it was one. */
  readonly stripeSubscriptionId: Option.Option<string>;
  readonly workspaceId: Option.Option<WorkspaceId>;
}

const decodeReason = Schema.decodeUnknownOption(StaffReasonSchema);

/**
 * Each credit or refund staff marked settled, for the billing context, in
 * the staff audit log (`settleCreditProblem`): its Stripe ids, its
 * workspace and the reason staff gave.
 */
export class CreditProblemAudit extends Context.Service<
  CreditProblemAudit,
  {
    readonly settled: (
      settled: SettledCreditProblem
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/staff/application/CreditProblemAudit") {
  static readonly layer = Layer.effect(
    CreditProblemAudit,
    Effect.gen(function* CreditProblemAuditLive() {
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const settled = Effect.fn("CreditProblemAudit.settled")(function* settled(
        entry: SettledCreditProblem
      ) {
        yield* log.record(
          new AuditEvent({
            action: "settleCreditProblem",
            at: entry.at,
            banExpiresAt: Option.none(),
            id: yield* newId(AuditEventIdSchema),
            objectIds: objectIdsOf({
              refundId: Option.getOrUndefined(entry.refundId),
              subscriptionId: Option.getOrUndefined(entry.stripeSubscriptionId),
            }),
            reason: decodeReason(entry.reason.slice(0, maxReasonLength)),
            staffId: Option.some(entry.staffId),
            targetId: Option.none(),
            workspaceId: entry.workspaceId,
          })
        );
      }, Effect.provideContext(ports));

      return CreditProblemAudit.of({ settled });
    })
  );
}
