import { Effect, Layer } from "effect";

import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { Notify } from "#notifications/application/notify.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Billing's notices through the notifications context: one notice per
 * member who manages billing, and an email, whatever their email choices.
 */
export const NotifiedBillingNoticesLive = Layer.effect(
  BillingNotices,
  Effect.gen(function* NotifiedBillingNoticesLive() {
    const notify = yield* Notify;

    return BillingNotices.of({
      tell: ({ key, notice, workspaceId }) =>
        notify.notify({ event: notice, key, workspaceId }).pipe(
          Effect.catchTag("RecipientsUnavailable", (cause) =>
            Effect.fail(new DatabaseError({ cause }))
          ),
          Effect.withSpan("BillingNotices.tell")
        ),
    });
  })
);
