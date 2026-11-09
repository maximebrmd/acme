import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/** What publishing learns about a channel's connection. */
export class ChannelHealth extends Context.Service<
  ChannelHealth,
  {
    /**
     * The platform refused the channel's token for good: nothing goes out on
     * it until the user reconnects it.
     */
    readonly reconnectRequired: (
      channelId: ChannelId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/publishing/application/ChannelHealth") {}
