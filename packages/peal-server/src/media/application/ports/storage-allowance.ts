import { Context, Effect, Option } from "effect";

import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many bytes of media a workspace may store: its billing account's
 * allowance, from the billing context, or no limit on a server that does
 * not bill; and the other workspaces whose media counts with its own
 * against it (its pool: a partner's, or its billing account's). A
 * database failure is a defect here, as everywhere in media.
 */
export class StorageAllowance extends Context.Service<
  StorageAllowance,
  {
    readonly bytes: (workspaceId: WorkspaceId) => Effect.Effect<Allowance>;
    /**
     * The other workspaces of the workspace's pool. In a transaction, the
     * pool stays held until it ends: take it after the workspace's lock.
     */
    readonly sharedWith: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WorkspaceId[]>;
  }
>()("peal-server/media/application/StorageAllowance") {
  /** No limit, as on a server that does not bill. */
  static readonly unlimited = StorageAllowance.of({
    bytes: () => Effect.succeed(Option.none()),
    sharedWith: () => Effect.succeed([]),
  });
}
