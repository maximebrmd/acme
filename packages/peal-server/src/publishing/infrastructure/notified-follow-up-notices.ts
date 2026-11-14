import { DateTime, Effect, Layer, Option } from "effect";

import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { FollowUpNotices } from "#publishing/application/follow-up-notices.ts";
import type { FollowUpRule } from "#publishing/domain/follow-up-rule.ts";
import { notSentReasonsOf } from "#publishing/domain/follow-up.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

// The UTC day of an instant, as `2026-11-10`.
const dayOf = (at: DateTime.Utc) => DateTime.formatIso(at).slice(0, 10);

/**
 * FollowUpNotices through the notifications context, in the transaction
 * that records what it tells, to whoever started the rule while they are a
 * member (as a post's author), else to every member who may schedule
 * posts, and to those who chose to hear of every post: `FollowUpsNotSent`
 * keyed by the rule and the UTC day, so a day's is told once;
 * `FollowUpRuleStopped` keyed by the rule, which ends once. Ids, a count
 * and reasons only: never the rule's comment.
 */
export const NotifiedFollowUpNotices = Layer.effect(
  FollowUpNotices,
  Effect.gen(function* NotifiedFollowUpNotices() {
    const notices = yield* Notify;

    const tell = (
      rule: FollowUpRule,
      event: NoticeRequest["event"],
      key: string
    ) =>
      notices
        .notify({
          ...Option.match(rule.startedBy, {
            onNone: () => ({}),
            onSome: (author) => ({ author }),
          }),
          event,
          key,
          workspaceId: rule.workspaceId,
        })
        .pipe(
          Effect.catchTag("RecipientsUnavailable", (failure) =>
            Effect.fail(new DatabaseError({ cause: failure }))
          )
        );

    return FollowUpNotices.of({
      notSent: (rule, followUps, now) =>
        followUps.length === 0
          ? Effect.void
          : tell(
              rule,
              {
                _tag: "FollowUpsNotSent",
                count: followUps.length,
                reasons: notSentReasonsOf(followUps),
                ruleId: rule.id,
              },
              `follow-ups-not-sent:${rule.id}:${dayOf(now)}`
            ),
      stopped: (rule, reason) =>
        tell(
          rule,
          { _tag: "FollowUpRuleStopped", reason, ruleId: rule.id },
          `follow-up-rule:${rule.id}:stopped`
        ),
    });
  })
);
