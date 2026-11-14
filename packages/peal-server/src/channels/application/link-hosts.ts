import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** Who a hosted page says asks for the connection. */
export interface LinkHost {
  /**
   * A colour (`#RRGGBB`) to draw a line in beside the logo, which the
   * workspace context checked reads on Peal's light pages; none for
   * Peal's own look.
   */
  readonly accentColor: Option.Option<string>;
  /** A logo to show from its own address; none shows the name alone. */
  readonly logoUrl: Option.Option<string>;
  /**
   * The partner the workspace belongs to, as its customers know it, or
   * the workspace's own name.
   */
  readonly name: string;
}

/**
 * Who stands behind a workspace's connect links, as the workspace context
 * says: the partner account that owns the workspace, or whose home
 * workspace it is, with the name and logo its customers see and the
 * origins it registered to send them back to; any other workspace under
 * its own name, with no return address.
 */
export class LinkHosts extends Context.Service<
  LinkHosts,
  {
    /** None once the workspace is gone. */
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<LinkHost>, DatabaseError>;
    /**
     * Whether a hosted page of the workspace may send a browser to this
     * address: its origin is one the workspace's partner registered,
     * exactly. Never for a workspace without a partner.
     */
    readonly allowsReturnTo: (
      workspaceId: WorkspaceId,
      returnUrl: string
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/channels/application/LinkHosts") {
  /** For tests: every workspace under one name, returning to `origins`. */
  static readonly layerTest = (
    host: LinkHost,
    origins: readonly string[] = []
  ) =>
    Layer.succeed(
      LinkHosts,
      LinkHosts.of({
        allowsReturnTo: (_workspaceId, returnUrl) =>
          Effect.succeed(
            URL.canParse(returnUrl) &&
              origins.includes(new URL(returnUrl).origin)
          ),
        of: () => Effect.succeed(Option.some(host)),
      })
    );
}
