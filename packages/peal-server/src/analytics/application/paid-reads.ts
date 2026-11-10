import { Context } from "effect";
import type { Effect } from "effect";

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
    ) => Effect.Effect<readonly string[], DatabaseError>;
  }
>()("peal-server/analytics/application/PaidReads") {}
