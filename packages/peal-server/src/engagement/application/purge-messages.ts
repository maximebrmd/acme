import { Context, DateTime, Effect, Layer, Metric } from "effect";

import { conversationsKeptSince } from "#engagement/domain/conversation.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { MessageStore } from "./ports/message-store.ts";
import type { MessagesPurged } from "./ports/message-store.ts";

/**
 * Purges of conversations that failed: conversations past their time then
 * stay until one succeeds, and an alert says so
 * (`peal-messages-retention-failing`).
 */
export const messagesRetentionFailures = Metric.counter(
  "peal.engagement.messages.retention_failures",
  {
    description: "Hourly purges of conversations past their time that failed",
    incremental: true,
  }
);

// What one pass deletes at most: passes follow until one deletes less.
const perPass = 1000;

/**
 * Keeps no message longer than `conversationsKeptFor` after it was sent:
 * it is deleted, a message sent from Peal once settled that long ago, and
 * a conversation once its last message is that old, unless a message to
 * it is still on its way. Run hourly, so nothing outlives its time by
 * more than an hour.
 */
export class PurgeMessages extends Context.Service<
  PurgeMessages,
  { readonly purge: Effect.Effect<MessagesPurged, DatabaseError> }
>()("peal-server/engagement/application/PurgeMessages") {
  static readonly layer = Layer.effect(
    PurgeMessages,
    Effect.gen(function* PurgeMessagesLive() {
      const store = yield* MessageStore;

      const purge = Effect.gen(function* purge() {
        const since = conversationsKeptSince(yield* DateTime.now);
        let conversations = 0;
        let messages = 0;

        for (;;) {
          const pass = yield* store.purge(since, perPass);

          conversations += pass.conversations;
          messages += pass.messages;

          if (pass.conversations < perPass && pass.messages < perPass) {
            const purged: MessagesPurged = { conversations, messages };

            return purged;
          }
        }
      }).pipe(Effect.withSpan("PurgeMessages.purge"));

      return PurgeMessages.of({ purge });
    })
  );
}
