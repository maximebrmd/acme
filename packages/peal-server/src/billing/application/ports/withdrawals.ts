import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { Money } from "#billing/domain/billing-notice.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** A consumer's withdrawal from a subscription. */
export interface Withdrawal {
  readonly refunded: Money;
  readonly requestedAt: DateTime.Utc;
  readonly stripeSubscriptionId: string;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

/** The withdrawals made, one per subscription at most. */
export class Withdrawals extends Context.Service<
  Withdrawals,
  {
    /**
     * Records the withdrawal, and answers it; one recorded before for the
     * same subscription is answered as it was, so a withdrawal tried again
     * refunds the same amount.
     */
    readonly record: (
      withdrawal: Withdrawal
    ) => Effect.Effect<Withdrawal, DatabaseError>;
  }
>()("peal-server/billing/application/Withdrawals") {}
