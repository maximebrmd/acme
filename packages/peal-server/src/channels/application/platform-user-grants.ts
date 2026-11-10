import { Context, Effect } from "effect";

import type { MetaAppKind } from "#channels/domain/data-deletion.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * What other contexts keep that rests on a platform user's grant to one of
 * Meta's apps, beside channels: the sign-ins to Meta's ad network, which
 * the ads context holds. A platform's request about a user reaches them
 * through here.
 */
export interface PlatformUserGrantsService {
  /**
   * The user asked the platform to have their data deleted: what rests on
   * their grant goes, with its tokens.
   */
  readonly erase: (
    app: MetaAppKind,
    platformUserId: string
  ) => Effect.Effect<void, DatabaseError>;
  /** The user removed the app: their grants no longer work. */
  readonly deauthorized: (
    app: MetaAppKind,
    platformUserId: string
  ) => Effect.Effect<void, DatabaseError>;
}

/**
 * The other contexts' grants: none unless the composition root says
 * otherwise, as on a server without ads.
 */
export const PlatformUserGrants = Context.Reference<PlatformUserGrantsService>(
  "peal-server/channels/application/PlatformUserGrants",
  {
    defaultValue: () => ({
      deauthorized: () => Effect.void,
      erase: () => Effect.void,
    }),
  }
);
