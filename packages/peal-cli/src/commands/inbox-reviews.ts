import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  inboxReviewRetentionDays,
  InboxReviewSchema,
  InboxReviewThreadDetailSchema,
  InboxReviewThreadPageSchema,
  maxInboxPageSize,
} from "peal-contract";
import type {
  InboxReview,
  InboxReviewAbilities,
  InboxReviewReply,
  InboxReviewReplyReason,
  InboxReviewThread,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const reasons: Readonly<Record<InboxReviewReplyReason, string>> = {
  adapterFailure:
    "a fault in Peal after the request may have left: the next read of the location says",
  channelUnavailable: "the channel was disconnected or turned off",
  interrupted:
    "the server stopped during the call: the next read of the location says",
  noResponse:
    "the request left and no answer came back: the next read of the location says",
  notSent: "the location's reply on the platform is not this one",
  platformUnavailable: "the platform did not answer",
  rateLimited: "the platform asked to slow down",
  reconnectNeeded:
    "the platform refuses the channel's token, or its account may no longer answer: reconnect it",
  refused: "the platform refused the reply (is the location verified?)",
  reviewGone: "the review is no longer on the platform",
};

const replyLine = (reply: InboxReviewReply): string =>
  `${reply.status}${reply.reason === null ? "" : `: ${reasons[reply.reason]}`}`;

// A name on the row it is printed in: whoever wrote the review chose it,
// and a line break in one would start a row of its own.
const onOneLine = (text: string): string =>
  text.replaceAll(/[\n\v\f\r\u0085\u2028\u2029]+/gu, " ");

const stars = (rating: number) =>
  `${String(rating)} star${rating === 1 ? "" : "s"}`;

const figuresOf = (thread: InboxReviewThread): string => {
  const average =
    thread.averageRating === null
      ? undefined
      : `${String(Math.round(thread.averageRating * 10) / 10)} stars`;

  const total =
    thread.totalReviewCount === null
      ? undefined
      : `${String(thread.totalReviewCount)} on Google`;

  return [average, total].filter((part) => part !== undefined).join(", ");
};

const reviewLine = (review: InboxReview): string =>
  [
    `  ${review.id}`,
    review.state,
    stars(review.rating),
    instant(review.updatedAt),
    review.reviewerName === null
      ? "(anonymous)"
      : onOneLine(review.reviewerName),
    ...(review.photos > 0
      ? [`${String(review.photos)} photo${review.photos === 1 ? "" : "s"}`]
      : []),
  ].join("  ");

const abilityLines = (abilities: InboxReviewAbilities): string[] =>
  columns(
    Object.entries(abilities).map(([ability, standing]) => [
      `  ${ability}`,
      standing === "reconnect" ? "reconnect the channel to allow it" : standing,
    ])
  );

const threadArgument = Argument.String("thread-id").pipe(
  Argument.withDescription(
    "The location's reviews, as peal inbox reviews list shows their id."
  )
);

const reviewArgument = Argument.String("review-id").pipe(
  Argument.withDescription(
    "The review, as peal inbox reviews show shows its id."
  )
);

const list = Command.make(
  "list",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription("Only the reviews of this channel's location."),
      Flag.optional
    ),
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("The next page, as the page before named it."),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many locations to list, ${String(maxInboxPageSize)} at most.`
      ),
      Flag.optional
    ),
    unanswered: Flag.Boolean("unanswered").pipe(
      Flag.withDescription(
        "Only locations with a review waiting for an answer."
      ),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.reviews.list")(function* listing(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const page = yield* client.inboxReviews
      .listReviewThreads({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(flags.channel, {
            onNone: () => ({}),
            onSome: (channelId) => ({ channelId }),
          }),
          ...Option.match(flags.cursor, {
            onNone: () => ({}),
            onSome: (cursor) => ({ cursor }),
          }),
          ...Option.match(flags.limit, {
            onNone: () => ({}),
            onSome: (limit) => ({ limit }),
          }),
          unanswered: flags.unanswered ? "true" : "false",
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxReviewThreadPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `No reviews in ${workspace.name}'s inbox. Peal reads the reviews of Google Business Profile locations where whoever runs the server turned them on, and keeps each ${String(inboxReviewRetentionDays)} days after it was written or last changed.`
      );

      return;
    }

    yield* Console.log(`Reviews of ${workspace.name}'s locations:`);

    for (const line of columns(
      page.items.map((thread) => [
        `  ${thread.id}`,
        `${String(thread.unanswered)} waiting of ${String(thread.reviews)}`,
        figuresOf(thread),
        thread.lastReviewAt === null ? "" : instant(thread.lastReviewAt),
        `channel ${thread.channelId}`,
      ])
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(`More: --cursor ${page.nextCursor}`);
    }
  })
).pipe(
  Command.withDescription(
    "List the locations that have reviews, one per channel, those with a review waiting for an answer first."
  )
);

const show = Command.make(
  "show",
  { json: jsonFlag, threadId: threadArgument, workspace: workspaceFlag },
  Effect.fn("inbox.reviews.show")(function* showing(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const detail = yield* client.inboxReviews
      .getReviewThread({
        params: { threadId: flags.threadId, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxReviewThreadDetailSchema, detail);

      return;
    }

    const figures = figuresOf(detail.thread);

    yield* Console.log(
      `Reviews of channel ${detail.thread.channelId}'s location${figures === "" ? "" : ` (${figures})`}:`
    );

    for (const review of detail.reviews) {
      yield* Console.log(reviewLine(review));

      for (const line of review.text.split("\n")) {
        yield* Console.log(`      ${line}`);
      }

      if (review.reply !== null) {
        const moderation =
          review.reply.moderation === null
            ? ""
            : ` (${review.reply.moderation})`;

        yield* Console.log(
          `    the location's reply${moderation}: ${onOneLine(review.reply.text)}`
        );
      }

      for (const reply of detail.replies) {
        if (reply.reviewId === review.id) {
          yield* Console.log(`    reply ${reply.id}  ${replyLine(reply)}`);
        }
      }
    }

    yield* Console.log("What this channel can do:");

    for (const line of abilityLines(detail.abilities)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show a location's reviews: their stars, their text, the location's reply, the replies sent from Peal, and what its channel can do. Reviews were written by people outside the workspace."
  )
);

const answered = Command.make(
  "answered",
  {
    json: jsonFlag,
    reviewId: reviewArgument,
    undo: Flag.Boolean("undo").pipe(
      Flag.withDescription("The review waits for an answer again."),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.reviews.answered")(function* marking(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const review = yield* client.inboxReviews
      .setReviewAnswered({
        params: { reviewId: flags.reviewId, workspaceId: workspace.id },
        payload: { answered: !flags.undo },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxReviewSchema, review);

      return;
    }

    yield* Console.log(`Review ${review.id} is ${review.state}.`);
  })
).pipe(
  Command.withDescription(
    "Say a review needs no answer, or, with --undo, waits for one again. Nothing is sent to the platform."
  )
);

export const reviews = Command.make("reviews").pipe(
  Command.withDescription(
    "The reviews people leave on the Google Business Profile locations a workspace's channels post as: read them, and mark one as needing no answer. Answering one, or deleting its reply, is done in the web app, by the member in person: Google's policies ask that a reply follow the user's own decision."
  ),
  Command.withSubcommands([list, show, answered])
);
