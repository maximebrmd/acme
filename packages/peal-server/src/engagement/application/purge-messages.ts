import { Context, DateTime, Effect, Layer, Metric } from "effect";

import { conversationsKeptSince } from "#engagement/domain/conversation.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { MessageStore } from "./ports/message-store.ts";

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
 * Keeps no conversation longer than `conversationsKeptFor` after its last
 * message: it is deleted with every message it holds and those sent from
 * Peal. Run hourly, so nothing outlives its time by more than an hour.
 */
export class PurgeMessages extends Context.Service<
  PurgeMessages,
  { readonly purge: Effect.Effect<number, DatabaseError> }
>()("peal-server/engagement/application/PurgeMessages") {
  static readonly layer = Layer.effect(
    PurgeMessages,
    Effect.gen(function* PurgeMessagesLive() {
      const store = yield* MessageStore;

      const purge = Effect.gen(function* purge() {
        const since = conversationsKeptSince(yield* DateTime.now);
        let purged = 0;

        for (;;) {
          const pass = yield* store.purge(since, perPass);

          purged += pass;

          if (pass < perPass) {
            return purged;
          }
        }
      }).pipe(Effect.withSpan("PurgeMessages.purge"));

      return PurgeMessages.of({ purge });
    })
  );
}
