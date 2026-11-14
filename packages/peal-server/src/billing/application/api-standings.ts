import { Context, Effect, Layer, Option } from "effect";

import { rateCard } from "#billing/domain/rate-card.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/**
 * What the API's rate limit asks of billing: on a server that bills, the
 * limit of a billing account without a payment method (the rate card's
 * `apiRequestsPerMinute.withoutPaymentMethod`), and which workspaces'
 * billing accounts pay: per-account pricing that entitles (active or past
 * due) or a legacy plan, as `WorkspaceEntitlements` reads them, in two
 * reads whatever their number. On one that does not bill, nothing.
 */
export class ApiStandings extends Context.Service<
  ApiStandings,
  {
    readonly withoutPaymentMethod: Option.Option<number>;
    readonly paying: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlySet<WorkspaceId>, DatabaseError>;
  }
>()("peal-server/billing/application/ApiStandings") {
  static readonly layer = Layer.effect(
    ApiStandings,
    Effect.gen(function* ApiStandingsLive() {
      const { enabled } = yield* BillingMode;
      const entitlements = yield* WorkspaceEntitlements;

      return ApiStandings.of({
        paying: Effect.fn("ApiStandings.paying")(
          function* paying(workspaceIds) {
            const each = yield* entitlements.ofEach(workspaceIds);

            return new Set(
              [...each].flatMap(([id, { plan }]) =>
                Option.exists(plan, (held) => held !== "free") ? [id] : []
              )
            );
          }
        ),
        withoutPaymentMethod: enabled
          ? Option.some(rateCard.apiRequestsPerMinute.withoutPaymentMethod)
          : Option.none(),
      });
    })
  );
}
