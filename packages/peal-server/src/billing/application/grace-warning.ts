import { Effect, Layer, Option } from "effect";

import type { BillingAccountId } from "#billing/domain/billing-account.ts";

import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";
import { WorkspaceStanding } from "./workspace-standing.ts";

// Billing accounts read at a time.
const page = 200;

/**
 * The billing workspaces on the free tier over their accounts, from the
 * first: none past the first page that holds one, as one is enough to
 * warn.
 */
export const firstOverFree = Effect.gen(function* firstOverFree() {
  const accounts = yield* BillingAccountStore;
  const entitlements = yield* WorkspaceEntitlements;
  const standing = yield* WorkspaceStanding;

  let after = Option.none<BillingAccountId>();

  for (;;) {
    const found = yield* accounts.page(after, page);
    const holders = [...new Set(found.map(({ holder }) => holder))];
    const plans = yield* entitlements.ofEach(holders);

    const over = [...(yield* standing.overPlanIn(holders))].filter((id) =>
      Option.contains(plans.get(id)?.plan ?? Option.none(), "free")
    );

    if (over.length > 0 || found.length < page) {
      return over;
    }

    after = Option.fromUndefinedOr(found.at(-1)?.id);
  }
});

/**
 * At start, on a server that bills without a grace
 * (PEAL_BILLING_GRACE_UNTIL), a warning when a workspace on the free tier
 * holds more accounts than it includes: it publishes nothing, as after an
 * upgrade from the plans priced by channels, whose free plan held 3.
 * Looked at on a fiber of its own, so the server starts at once.
 */
export const GraceWarningLive = Layer.effectDiscard(
  Effect.gen(function* GraceWarning() {
    const { enabled, graceUntil } = yield* BillingMode;

    if (!enabled || Option.isSome(graceUntil)) {
      return;
    }

    yield* firstOverFree.pipe(
      Effect.flatMap((over) =>
        over.length === 0
          ? Effect.void
          : Effect.logWarning(
              "Workspaces on the free tier hold more connected accounts than it includes, and publish nothing: set PEAL_BILLING_GRACE_UNTIL to keep them publishing until a day while their billing managers are told"
            ).pipe(Effect.annotateLogs({ example: over[0] ?? "" }))
      ),
      Effect.catchCause((cause) =>
        Effect.logWarning(
          "Could not look for workspaces over the free tier at start",
          cause
        )
      ),
      Effect.forkScoped
    );
  })
);
