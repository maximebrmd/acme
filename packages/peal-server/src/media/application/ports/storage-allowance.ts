import { Context, Effect, Option } from "effect";

import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many bytes of media a workspace may store: its plan's allowance,
 * from the billing context, or no limit on a server that does not bill.
 * A database failure is a defect here, as everywhere in media.
 */
export class StorageAllowance extends Context.Service<
  StorageAllowance,
  {
    readonly bytes: (workspaceId: WorkspaceId) => Effect.Effect<Allowance>;
  }
>()("peal-server/media/application/StorageAllowance") {
  /** No limit, as on a server that does not bill. */
  static readonly unlimited = StorageAllowance.of({
    bytes: () => Effect.succeed(Option.none()),
  });
}
