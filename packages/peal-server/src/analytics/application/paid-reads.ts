import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** What a workspace is about to read on a platform that bills each read. */
export interface PaidReadClaim {
  readonly platform: Platform;
  /**
   * What is read, by the platform's ids (a post's, an account's): ids
   * only, which name the resource a read is billed for.
   */
  readonly resources: readonly string[];
  readonly workspaceId: WorkspaceId;
}

/** What a claim covers: the resources it may read now, and the new ones. */
export interface PaidReadsCovered {
  /** Those it may read, in the order asked. */
  readonly resources: readonly string[];
  /**
   * Of them, those this claim counted for the day (not read before today):
   * what `release` takes back when the platform did not return them.
   */
  readonly fresh: readonly string[];
  /** When it was claimed: the day its rows count in, and their month. */
  readonly at: DateTime.Utc;
}

/** Resources a claim counted fresh to take back, with that claim's instant. */
export interface PaidReadRelease extends PaidReadClaim {
  readonly at: DateTime.Utc;
}

/**
 * The reads of a platform that bills the server's app for each resource it
 * returns, counted per workspace and UTC day. A resource already read that
 * day is not counted again, as the platform bills it once a day; a new one
 * is taken while the workspace's allowance for the day lasts.
 */
export class PaidReads extends Context.Service<
  PaidReads,
  {
    /**
     * Counts these reads for today, and answers the resources the
     * workspace may read: those it already read today, then new ones in
     * the order given, up to its allowance. Claimed before the platform is
     * asked, so reads sent together never pass the allowance.
     */
    readonly claim: (
      claim: PaidReadClaim
    ) => Effect.Effect<PaidReadsCovered, DatabaseError>;
    /**
     * Takes back resources a claim counted fresh that the platform did not
     * return (a refusal, a failed call, a token refused, a post gone): the
     * platform bills only what it returns, so they are neither billed nor
     * kept as read today. Where the server does not bill, the operator's
     * daily allowance keeps them counted, as before.
     */
    readonly release: (
      released: PaidReadRelease
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Whether the workspace reads the platform at all: on a server that
     * bills, only once it turned X's reads on; elsewhere always. A reader
     * skips a workspace that does not, as paused, before claiming.
     */
    readonly reads: (
      workspaceId: WorkspaceId,
      platform: Platform
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/analytics/application/PaidReads") {}
