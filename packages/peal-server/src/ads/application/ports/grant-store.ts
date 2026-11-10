import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { AdGrant } from "#ads/domain/ad-grant.ts";
import type { AdNetwork } from "#ads/domain/ad-network.ts";
import type { AdGrantId } from "#ads/domain/ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** A grant's token as stored: sealed by `GrantSecrets`. */
export type SealedToken = string;

/** A sign-in in progress, between its start and its callback. */
export interface SignInAttempt {
  readonly expiresAt: DateTime.Utc;
  readonly network: AdNetwork;
  readonly startedBy: UserId;
  /** The SHA-256 of the state the network sends back, in hexadecimal. */
  readonly stateHash: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * The grants of every workspace, their sealed tokens, and the sign-ins in
 * progress. Reads that name a workspace only find its own.
 */
export class GrantStore extends Context.Service<
  GrantStore,
  {
    readonly saveAttempt: (
      attempt: SignInAttempt
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Removes and returns the attempt, if it is this member's in this
     * workspace: a callback completes it once.
     */
    readonly takeAttempt: (
      stateHash: string,
      owner: { readonly startedBy: UserId; readonly workspaceId: WorkspaceId }
    ) => Effect.Effect<Option.Option<SignInAttempt>, DatabaseError>;
    /**
     * Saves a grant with its token, replacing the one the same person
     * holds on the network in the workspace, whose id it keeps; answers
     * the grant as stored.
     */
    readonly upsert: <E>(
      grant: AdGrant,
      token: (id: AdGrantId) => Effect.Effect<SealedToken, E>
    ) => Effect.Effect<AdGrant, DatabaseError | E>;
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly AdGrant[], DatabaseError>;
    readonly findIn: (
      workspaceId: WorkspaceId,
      grantId: AdGrantId
    ) => Effect.Effect<Option.Option<AdGrant>, DatabaseError>;
    /** Any workspace's grant with its sealed token, for the jobs. */
    readonly token: (
      grantId: AdGrantId
    ) => Effect.Effect<
      Option.Option<{ readonly grant: AdGrant; readonly token: SealedToken }>,
      DatabaseError
    >;
    /**
     * Marks the grant as needing its person again; says whether this call
     * changed it, so they are told once.
     */
    readonly markRejected: (
      grantId: AdGrantId,
      now: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Deletes the grant, its token and every account connected with it. */
    readonly remove: (
      workspaceId: WorkspaceId,
      grantId: AdGrantId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes the attempts expired by `now`, and the grants made before
     * `unusedSince` that connect no account; says how many rows went.
     */
    readonly purge: (
      now: DateTime.Utc,
      unusedSince: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/ads/application/GrantStore") {}
