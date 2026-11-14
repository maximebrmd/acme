import { Context, Effect, Layer, Option } from "effect";

import { rateCard } from "#billing/domain/rate-card.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** A billing account's standing, for the API's rate limit. */
export interface ApiStanding {
  /** Its billing workspace, which names it; none when there is none. */
  readonly account: Option.Option<string>;
  /** Whether it pays: per-account pricing that entitles, or a legacy plan. */
  readonly paying: boolean;
}

// Whether a plan is one that pays.
const pays = (plan: Option.Option<string>) =>
  Option.exists(plan, (held) => held !== "free");

/**
 * What the API's rate limit asks of billing: on a server that bills, the
 * limit of a billing account without a payment method (the rate card's
 * `apiRequestsPerMinute.withoutPaymentMethod`); the billing account of
 * each workspace (its billing workspace, a partner's home for its pool)
 * and whether it pays, in a few reads whatever their number; and a
 * person's own: the accounts they pay for, paying when any does. On one
 * that does not bill, nothing.
 */
export class ApiStandings extends Context.Service<
  ApiStandings,
  {
    readonly withoutPaymentMethod: Option.Option<number>;
    readonly ofWorkspaces: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, ApiStanding>, DatabaseError>;
    readonly ofPayer: (
      userId: UserId
    ) => Effect.Effect<ApiStanding, DatabaseError>;
  }
>()("peal-server/billing/application/ApiStandings") {
  static readonly layer = Layer.effect(
    ApiStandings,
    Effect.gen(function* ApiStandingsLive() {
      const { enabled } = yield* BillingMode;
      const entitlements = yield* WorkspaceEntitlements;
      const holders = yield* PlanHolders;
      const accounts = yield* BillingAccountStore;

      const ofWorkspaces = Effect.fn("ApiStandings.ofWorkspaces")(
        function* ofWorkspaces(workspaceIds: readonly WorkspaceId[]) {
          const heldBy = yield* holders.heldByEach(workspaceIds);
          const each = yield* entitlements.ofEach(workspaceIds);

          return new Map(
            workspaceIds.map((id): [WorkspaceId, ApiStanding] => [
              id,
              {
                account: Option.some(heldBy.get(id)?.holder ?? id),
                paying: pays(each.get(id)?.plan ?? Option.none()),
              },
            ])
          );
        }
      );

      const ofPayer = Effect.fn("ApiStandings.ofPayer")(function* ofPayer(
        userId: UserId
      ) {
        const paid = yield* accounts.paidBy(userId);
        const own = yield* accounts.personalOf(userId);
        const held = paid.map(({ holder }) => holder);
        const each = yield* entitlements.ofEach(held);

        const standing: ApiStanding = {
          account: Option.orElse(
            own.pipe(Option.map(({ holder }) => holder)),
            () => Option.fromUndefinedOr(held[0])
          ),
          paying: held.some((holder) =>
            pays(each.get(holder)?.plan ?? Option.none())
          ),
        };

        return standing;
      });

      return ApiStandings.of({
        ofPayer,
        ofWorkspaces,
        withoutPaymentMethod: enabled
          ? Option.some(rateCard.apiRequestsPerMinute.withoutPaymentMethod)
          : Option.none(),
      });
    })
  );
}
