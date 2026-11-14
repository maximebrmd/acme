import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/** A connected Google Business Profile channel: the location it posts as. */
export interface ConnectedLocation {
  readonly channelId: ChannelId;
  readonly workspaceId: WorkspaceId;
}

/**
 * Every connected channel whose account is a location with reviews, from
 * the channels context, in the order of their ids, a page at a time.
 */
export class ReviewLocations extends Context.Service<
  ReviewLocations,
  {
    /**
     * The locations among at most `limit` channels after `after`, or from
     * the first, and the last channel the page reached, to start the next
     * from; none once every channel was reached.
     */
    readonly after: (
      after: Option.Option<ChannelId>,
      limit: number
    ) => Effect.Effect<
      {
        readonly locations: readonly ConnectedLocation[];
        readonly reached: Option.Option<ChannelId>;
      },
      DatabaseError
    >;
  }
>()("peal-server/engagement/application/ReviewLocations") {}
