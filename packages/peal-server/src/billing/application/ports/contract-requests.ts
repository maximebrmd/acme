import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type {
  ContractRequest,
  ContractRequestId,
} from "#billing/domain/contract-request.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The requests to cancel a contract or withdraw from it, as they were
 * received. With their workspace while it exists; then, once it is erased,
 * without it, for `contractRetention`. Those no contract was found for stay
 * as long from the day they were received.
 */
export class ContractRequests extends Context.Service<
  ContractRequests,
  {
    /**
     * Takes one of the `limit` acknowledgements the address may be sent
     * since `since`, for this request, at `at`: false when it has had them
     * all. The address is read whatever its case, and those asking
     * together take turns, so none passes the limit with another. A claim
     * whose email then does not leave is given back by saving the request
     * as it was.
     */
    readonly claimAcknowledgement: (claim: {
      readonly at: DateTime.Utc;
      readonly email: string;
      readonly id: ContractRequestId;
      readonly limit: number;
      readonly since: DateTime.Utc;
    }) => Effect.Effect<boolean, DatabaseError>;
    /**
     * The request the link's token opens, by the token's digest: one that
     * awaits its confirmation, whose link has not expired at `now`.
     */
    readonly byConfirmation: (
      digest: string,
      now: DateTime.Utc
    ) => Effect.Effect<Option.Option<ContractRequest>, DatabaseError>;
    readonly byId: (
      id: ContractRequestId
    ) => Effect.Effect<Option.Option<ContractRequest>, DatabaseError>;
    /**
     * Leaves the workspace's requests without it, from now, in the caller's
     * transaction.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Leaves the user's requests without them, nor the name and address
     * they wrote, in the caller's transaction.
     */
    readonly forgetUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /** The requests the user made, or made with their address, oldest first. */
    readonly ofUser: (
      userId: UserId
    ) => Effect.Effect<readonly ContractRequest[], DatabaseError>;
    /**
     * The requests that wait for staff, oldest first: those no contract was
     * found for, and those whose sender has not followed their link.
     */
    readonly open: (
      limit: number
    ) => Effect.Effect<readonly ContractRequest[], DatabaseError>;
    /**
     * The form's requests received before `before` whose acknowledgement
     * has not left yet: the oldest and the newest, half of `limit` each,
     * so those that stay stuck never keep the sweep from the others.
     */
    readonly pending: (
      before: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly ContractRequest[], DatabaseError>;
    /**
     * Deletes the requests of workspaces erased before `before`, and those
     * no contract was found for received before it; says how many.
     */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Records a request, or what became of one recorded before. */
    readonly save: (
      request: ContractRequest
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Keeps the digest of the token of the request's link, which opens it
     * until `expiresAt`, in place of any before.
     */
    readonly setConfirmation: (
      id: ContractRequestId,
      digest: string,
      expiresAt: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/ContractRequests") {}
