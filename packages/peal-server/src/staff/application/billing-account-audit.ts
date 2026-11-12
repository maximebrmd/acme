import { Context, Effect, Layer, Option, Schema } from "effect";
import type { DateTime } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import { objectIdsOf } from "#staff/domain/audit-operation.ts";
import {
  maxReasonLength,
  StaffReasonSchema,
} from "#staff/domain/staff-reason.ts";

import { AuditLog } from "./ports/audit-log.ts";

/** What a staff member did to a billing account, and why. */
export interface HandledBillingAccount {
  readonly action:
    | "mergeBillingAccounts"
    | "requirePaymentMethod"
    | "restoreFreeTier";
  /** The account acted on: the one merged, for a merge. */
  readonly accountId: string;
  readonly at: DateTime.Utc;
  /** The account merged into, for a merge. */
  readonly intoAccountId: Option.Option<string>;
  readonly reason: string;
  readonly staffId: UserId;
}

const decodeReason = Schema.decodeUnknownOption(StaffReasonSchema);

/**
 * What staff do to billing accounts, for the billing context, in the staff
 * audit log: the accounts' ids and the reason staff gave, never a person's
 * or a workspace's name.
 */
export class BillingAccountAudit extends Context.Service<
  BillingAccountAudit,
  {
    readonly handled: (
      handled: HandledBillingAccount
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/staff/application/BillingAccountAudit") {
  static readonly layer = Layer.effect(
    BillingAccountAudit,
    Effect.gen(function* BillingAccountAuditLive() {
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const handled = Effect.fn("BillingAccountAudit.handled")(
        function* handled(entry: HandledBillingAccount) {
          yield* log.record(
            new AuditEvent({
              action: entry.action,
              at: entry.at,
              banExpiresAt: Option.none(),
              id: yield* newId(AuditEventIdSchema),
              objectIds: objectIdsOf({
                accountId: entry.accountId,
                intoAccountId: Option.getOrUndefined(entry.intoAccountId),
              }),
              reason: decodeReason(entry.reason.slice(0, maxReasonLength)),
              staffId: Option.some(entry.staffId),
              targetId: Option.none(),
              workspaceId: Option.none(),
            })
          );
        },
        Effect.provideContext(ports)
      );

      return BillingAccountAudit.of({ handled });
    })
  );
}
