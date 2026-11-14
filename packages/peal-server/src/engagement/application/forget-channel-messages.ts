import { Effect } from "effect";

import type { MeteredUsage } from "#shared/application/metered-usage.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { claimOf } from "./outgoing-message-claim.ts";
import type { MessageStore } from "./ports/message-store.ts";

/**
 * Deletes what Peal keeps of a channel's direct messages (its switch, box,
 * conversations and the messages sent from Peal), and gives back the
 * outbound message of each that never set out: it is not sent, so it is
 * not billed. Run it in a transaction, which locks those messages until it
 * ends, so a job about to begin one finds it gone.
 */
export const forgetChannelMessages = (
  store: typeof MessageStore.Service,
  meters: typeof MeteredUsage.Service,
  channelId: ChannelId
) =>
  Effect.gen(function* forgetting() {
    const unsent = yield* store.unsentOf(channelId);

    yield* store.channelGone(channelId);

    yield* Effect.forEach(
      unsent,
      (message) => meters.giveBack(claimOf(message)),
      {
        discard: true,
      }
    );
  }).pipe(Effect.withSpan("forgetChannelMessages"));
