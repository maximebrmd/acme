import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ConnectedChannel } from "#analytics/domain/tracked-channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * Every connected channel, from the channels context, in the order of
 * their ids, a page at a time: analytics follows each one's account.
 */
export class ConnectedChannels extends Context.Service<
  ConnectedChannels,
  {
    /** At most `limit` channels after `after`, or from the first. */
    readonly after: (
      after: Option.Option<ChannelId>,
      limit: number
    ) => Effect.Effect<readonly ConnectedChannel[], DatabaseError>;
  }
>()("peal-server/analytics/application/ConnectedChannels") {}
