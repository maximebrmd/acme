import { Effect, Layer, Option } from "effect";

import { Notify } from "#notifications/application/notify.ts";
import { RecyclingNotices } from "#publishing/application/recycling-notices.ts";
import type { RecyclingEndReason } from "#publishing/domain/recycling-end-reason.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

type Told = Exclude<RecyclingEndReason, "completed" | "stopped">;

const isTold = (reason: RecyclingEndReason): reason is Told =>
  reason !== "completed" && reason !== "stopped";

/**
 * RecyclingNotices through the notifications context: `RecyclingEnded`,
 * in the transaction that ends the rule, to whoever started it while they
 * are a member (the post's author, as `recipientsOf` has it), else to
 * every member who may schedule posts, and to those who chose to hear of
 * every post. Keyed by the rule and how often it was resumed, so each end
 * is told once.
 */
export const NotifiedRecyclingNotices = Layer.effect(
  RecyclingNotices,
  Effect.gen(function* NotifiedRecyclingNotices() {
    const notices = yield* Notify;

    return RecyclingNotices.of({
      ended: (rule, reason) =>
        isTold(reason)
          ? notices
              .notify({
                ...Option.match(rule.startedBy, {
                  onNone: () => ({}),
                  onSome: (author) => ({ author }),
                }),
                event: {
                  _tag: "RecyclingEnded",
                  reason,
                  ruleId: rule.id,
                  sourcePostId: rule.sourcePostId,
                },
                key: `recycling:${rule.id}:ended:${String(rule.resumptions)}`,
                workspaceId: rule.workspaceId,
              })
              .pipe(
                Effect.catchTag("RecipientsUnavailable", (failure) =>
                  Effect.fail(new DatabaseError({ cause: failure }))
                )
              )
          : Effect.void,
    });
  })
);
