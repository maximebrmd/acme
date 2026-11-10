import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** What a partner's ownership of a workspace adds to its events. */
export interface EventOrigin {
  /** The partner's own id for the workspace, when it gave one. */
  readonly externalId: Option.Option<string>;
  /**
   * The partner's home workspace, whose endpoints of the `partner` scope
   * hear the workspace's events too.
   */
  readonly homeWorkspaceId: WorkspaceId;
}

/**
 * Whose the workspaces events happen in are, as the workspace context
 * says: a workspace a partner owns tells its events to the partner too,
 * with the partner's own id for it.
 */
export class EventOrigins extends Context.Service<
  EventOrigins,
  {
    /** None for a workspace no partner owns. */
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<EventOrigin>, DatabaseError>;
    /** Whether the workspace is a partner account's home workspace. */
    readonly isPartnerHome: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/webhooks/application/EventOrigins") {
  /** No partner owns any workspace: for servers and tests without them. */
  static readonly layerNone = Layer.succeed(
    EventOrigins,
    EventOrigins.of({
      isPartnerHome: () => Effect.succeed(false),
      of: () => Effect.succeedNone,
    })
  );

  /** For tests: the origins given, by workspace, and these homes. */
  static readonly layerTest = (
    origins: ReadonlyMap<WorkspaceId, EventOrigin>,
    homes: readonly WorkspaceId[] = []
  ) =>
    Layer.succeed(
      EventOrigins,
      EventOrigins.of({
        isPartnerHome: (workspaceId) =>
          Effect.succeed(homes.includes(workspaceId)),
        of: (workspaceId) =>
          Effect.succeed(Option.fromUndefinedOr(origins.get(workspaceId))),
      })
    );
}
