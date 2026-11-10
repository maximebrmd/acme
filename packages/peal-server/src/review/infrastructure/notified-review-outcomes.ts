import { Effect, Layer, Option } from "effect";

import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { ReviewOutcomes } from "#review/application/ports/review-outcomes.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

type Party = Extract<
  NoticeRequest["event"],
  { readonly _tag: "PostCommented" }
>["by"];

const partyOf = (reviewer: Reviewer): Party => {
  if (reviewer._tag === "apiKey") {
    return "application";
  }

  return reviewer._tag;
};

// The member who did it, who needs no telling.
const memberOf = (reviewer: Reviewer): Option.Option<UserId> =>
  reviewer._tag === "member" ? reviewer.userId : Option.none();

const about = (
  outcome: {
    readonly authorId: Option.Option<UserId>;
    readonly key: string;
    readonly workspaceId: NoticeRequest["workspaceId"];
  },
  event: NoticeRequest["event"],
  hearing: {
    readonly except: Option.Option<UserId>;
    readonly followers: readonly Option.Option<UserId>[];
  }
): NoticeRequest => ({
  event,
  followers: hearing.followers.flatMap((follower) => Option.toArray(follower)),
  key: outcome.key,
  workspaceId: outcome.workspaceId,
  ...Option.match(outcome.authorId, {
    onNone: () => ({}),
    onSome: (author) => ({ author }),
  }),
  ...Option.match(hearing.except, {
    onNone: () => ({}),
    onSome: (except) => ({ except }),
  }),
});

/**
 * A review's outcomes told through the notifications context, in the
 * transaction that made them: to those who may approve when an approval is
 * asked for, and to the post's author, whoever asked and whoever wrote in
 * its review for the rest, never to the member who did it (`recipientsOf`).
 * Notices say who acted by kind only (a member, a visitor, an application):
 * the names stay on the post's page.
 *
 * The database failing rolls the change back with its notices. Members the
 * workspace context cannot list are not told, which is logged: a decision
 * is not undone for it.
 */
export const NotifiedReviewOutcomes = Layer.effect(
  ReviewOutcomes,
  Effect.gen(function* NotifiedReviewOutcomes() {
    const notices = yield* Notify;

    const tell = (request: NoticeRequest) =>
      notices.notify(request).pipe(
        Effect.catchTag("RecipientsUnavailable", (failure) =>
          Effect.logWarning("A review's notice was not sent", failure)
        ),
        Effect.mapError((cause) => new DatabaseError({ cause }))
      );

    return ReviewOutcomes.of({
      approvalRequested: (outcome) =>
        tell(
          about(
            outcome,
            {
              _tag: "PostApprovalRequested",
              postId: outcome.postId,
              scheduledAt: outcome.scheduledAt,
            },
            { except: outcome.requestedBy, followers: [] }
          )
        ),
      approved: (outcome) =>
        tell(
          about(
            outcome,
            {
              _tag: "PostApproved",
              by: partyOf(outcome.by),
              late: outcome.late,
              postId: outcome.postId,
            },
            {
              except: memberOf(outcome.by),
              followers: [outcome.requestedBy],
            }
          )
        ),
      changesRequested: (outcome) =>
        tell(
          about(
            outcome,
            {
              _tag: "PostChangesRequested",
              by: partyOf(outcome.by),
              postId: outcome.postId,
            },
            {
              except: memberOf(outcome.by),
              followers: [outcome.requestedBy],
            }
          )
        ),
      commented: (outcome) =>
        tell(
          about(
            outcome,
            {
              _tag: "PostCommented",
              by: partyOf(outcome.by),
              postId: outcome.postId,
            },
            {
              except: memberOf(outcome.by),
              followers: outcome.participants.map(Option.some),
            }
          )
        ),
      settled: notices.resolve,
    });
  })
);
