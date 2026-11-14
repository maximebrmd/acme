import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Where staff marking a credit problem settled is recorded, before it is
 * marked: the staff context's audit log. Ids only.
 */
export class CreditProblemReview extends Context.Service<
  CreditProblemReview,
  {
    readonly settled: (settled: {
      readonly at: DateTime.Utc;
      readonly reason: string;
      readonly refundId: Option.Option<string>;
      readonly staffId: UserId;
      readonly stripeSubscriptionId: Option.Option<string>;
      readonly workspaceId: Option.Option<WorkspaceId>;
    }) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/CreditProblemReview") {}
