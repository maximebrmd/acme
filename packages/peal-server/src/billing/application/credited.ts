import { Effect, Option } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { InvoiceCredited } from "./ports/stripe-contracts.ts";
import { StripeUnreachable } from "./stripe-unreachable.ts";

/**
 * A refund the law owes (a withdrawal, a cancellation applied late) that
 * Stripe refused for any invoice fails as Stripe refusing for good, so
 * the request is left to staff, as before credits went on invoice by
 * invoice.
 */
export const refusedAsFailure =
  (workspaceId: WorkspaceId) =>
  (
    credited: readonly InvoiceCredited[]
  ): Effect.Effect<void, StripeUnreachable> => {
    const refused = credited.find(({ refused: code }) => Option.isSome(code));

    return refused === undefined
      ? Effect.void
      : Effect.fail(
          new StripeUnreachable({
            code: Option.getOrElse(refused.refused, () => "refused"),
            permanent: true,
            workspaceId,
          })
        );
  };
