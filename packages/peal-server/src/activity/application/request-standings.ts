import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** Where a billing account stands, for the rate limit. */
export interface AccountStanding {
  /**
   * The billing account, as the count of its free tier names it: its
   * billing workspace. None for a person who pays for no account.
   */
  readonly account: Option.Option<string>;
  /** Whether it pays: a payment method on file, or a legacy plan. */
  readonly paying: boolean;
}

/**
 * Whether billing accounts pay, for the rate limit: the billing context's
 * standing. `withoutPaymentMethod` is none on a server that does not bill,
 * where the setting applies to everyone and nothing is read; else the
 * limit of a billing account that does not pay (the rate card's).
 */
export class RequestStandings extends Context.Service<
  RequestStandings,
  {
    readonly withoutPaymentMethod: Option.Option<number>;
    /** The billing account of each of these workspaces, and whether it pays. */
    readonly ofWorkspaces: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, AccountStanding>,
      DatabaseError
    >;
    /**
     * The billing account the person pays for, and whether it pays (any
     * of theirs that does); none and free when they pay for none.
     */
    readonly ofPayer: (
      userId: UserId
    ) => Effect.Effect<AccountStanding, DatabaseError>;
  }
>()("peal-server/activity/application/RequestStandings") {
  /** A server that does not bill: no standing is read. */
  static readonly unbilled = Layer.succeed(
    RequestStandings,
    RequestStandings.of({
      ofPayer: () =>
        Effect.die("A server that does not bill reads no standing"),
      ofWorkspaces: () =>
        Effect.die("A server that does not bill reads no standing"),
      withoutPaymentMethod: Option.none(),
    })
  );
}
