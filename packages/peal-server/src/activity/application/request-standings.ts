import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Whether workspaces' billing accounts pay, for the rate limit: the
 * billing context's standing. `withoutPaymentMethod` is none on a server
 * that does not bill, where the setting applies to everyone and nothing is
 * read; else the limit of a billing account that does not pay (the rate
 * card's).
 */
export class RequestStandings extends Context.Service<
  RequestStandings,
  {
    readonly withoutPaymentMethod: Option.Option<number>;
    /**
     * Those of these workspaces whose billing account pays: a payment
     * method on file, or a legacy plan.
     */
    readonly paying: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlySet<WorkspaceId>, DatabaseError>;
  }
>()("peal-server/activity/application/RequestStandings") {
  /** A server that does not bill: no standing is read. */
  static readonly unbilled = Layer.succeed(
    RequestStandings,
    RequestStandings.of({
      paying: () => Effect.die("A server that does not bill reads no standing"),
      withoutPaymentMethod: Option.none(),
    })
  );
}
