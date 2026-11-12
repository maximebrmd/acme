import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api, CurrentMember } from "peal-contract";

import { AccountViews } from "#billing/application/account-views.ts";
import { BillingOverview } from "#billing/application/billing-overview.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { billingView, standingView } from "./billing-view.ts";

export const BillingHandlers = HttpApiBuilder.group(
  Api,
  "billing",
  Effect.fn(function* billingHandlers(handlers) {
    const overview = yield* BillingOverview;
    const standings = yield* WorkspaceStanding;
    const accounts = yield* AccountViews;

    return handlers
      .handle("get", () =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);

          const found = yield* overview.of(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return billingView(
            found,
            yield* accounts.of(actor).pipe(Effect.orDie)
          );
        })
      )
      .handle("standing", () =>
        Effect.gen(function* standing() {
          const actor = actorOf(yield* CurrentMember);

          const [found, account] = yield* Effect.all([
            standings.of(actor),
            accounts.of(actor),
          ]).pipe(Effect.orDie);

          return standingView(found, account);
        })
      );
  })
);
