import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { maxReviewLinkHours, ReviewLinkAccessSchema } from "peal-contract";
import type {
  ApprovalRequest,
  ReviewComment,
  Reviewer,
  ReviewLinkAccess,
} from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const postArgument = Argument.String("post-id").pipe(
  Argument.withDescription(
    "The post, as the web app or peal drafts list shows its id."
  )
);

// Who commented or decided, as the terminal names them.
const reviewerName = ({ kind, name }: Reviewer): string => {
  if (kind === "apiKey") {
    return "an API key";
  }

  if (kind === "visitor") {
    return `${name ?? "someone"} (reviewer)`;
  }

  return name ?? "a former member";
};

const approvalLine = (approval: ApprovalRequest): readonly string[] => [
  `  ${approval.status}`,
  `for ${instant(approval.schedule.at)}`,
  `asked ${instant(approval.requestedAt)}`,
  approval.decision === null
    ? ""
    : `decided by ${reviewerName(approval.decision.by)}, ${instant(approval.decision.at)}`,
];

// What a comment is about, when it is about some words or a channel.
const aboutOf = ({ anchor }: ReviewComment): string => {
  if (anchor === null) {
    return "";
  }

  if (anchor.selection === null) {
    return ` on channel ${anchor.channelId}`;
  }

  return anchor.selection.located === null
    ? ` on “${anchor.selection.quote}”, which the text no longer says`
    : ` on “${anchor.selection.quote}”`;
};

const commentLines = (comment: ReviewComment): readonly string[] => {
  const indent = comment.parentId === null ? "  " : "      ";
  const resolved = comment.resolved === null ? "" : " (resolved)";

  return [
    `${indent}${comment.id}  ${reviewerName(comment.author)}, ${instant(comment.createdAt)}${aboutOf(comment)}${resolved}:`,
    ...comment.text.split("\n").map((line) => `${indent}  ${line}`),
  ];
};

// Threads in order: each comment that started one, then its answers.
const threaded = (comments: readonly ReviewComment[]) =>
  comments
    .filter(({ parentId }) => parentId === null)
    .flatMap((root) => [
      root,
      ...comments.filter(({ parentId }) => parentId === root.id),
    ]);

const show = Command.make(
  "show",
  { postId: postArgument, workspace: workspaceFlag },
  Effect.fn("review.show")(function* show({ postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const { approvals, comments } = yield* client.review
      .thread({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Review of post ${postId} in ${workspace.name}.`);

    if (approvals.length > 0) {
      yield* Console.log("Approvals, newest first:");

      for (const line of columns(approvals.map(approvalLine))) {
        yield* Console.log(line);
      }
    }

    if (comments.length === 0) {
      yield* Console.log("Nobody commented on this post yet.");

      return;
    }

    yield* Console.log("Comments:");

    for (const comment of threaded(comments)) {
      for (const line of commentLines(comment)) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show a post's review: the approvals asked for it and what was decided, and its comments, thread by thread."
  )
);

const comment = Command.make(
  "comment",
  {
    postId: postArgument,
    replyTo: Flag.String("reply-to").pipe(
      Flag.withMetavar("<comment-id>"),
      Flag.withDescription(
        "The comment that started the thread to answer in, as peal review show lists it."
      ),
      Flag.optional
    ),
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription("What to say, in plain text.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("review.comment")(function* comment({
    postId,
    replyTo,
    text,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const written = yield* client.review
      .comment({
        params: { postId, workspaceId: workspace.id },
        payload: Option.match(replyTo, {
          onNone: () => ({ text }),
          onSome: (parentId) => ({ parentId, text }),
        }),
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Commented on post ${postId}: comment ${written.id}.`);
  })
).pipe(
  Command.withDescription(
    "Comment on a post, or answer a thread with --reply-to. Those who follow the post are told."
  )
);

// What a link lets its holders do, in words.
const accesses: Readonly<Record<ReviewLinkAccess, string>> = {
  approve: "approve the post or ask for changes, and comment",
  comment: "comment on the post",
  view: "see the post, and nothing more",
};

const links = Command.make(
  "links",
  { postId: postArgument, workspace: workspaceFlag },
  Effect.fn("review.links")(function* links({ postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const made = yield* client.review
      .links({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (made.length === 0) {
      yield* Console.log(`Post ${postId} has no review link.`);

      return;
    }

    yield* Console.log(`Review links of post ${postId}, newest first:`);

    for (const line of columns(
      made.map((link) => [
        `  ${link.id}`,
        link.access,
        link.status,
        link.status === "revoked" && link.revokedAt !== null
          ? `revoked ${instant(link.revokedAt)}`
          : `until ${instant(link.expiresAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List a post's review links: what each allows and until when. A link's address is shown only when it is made."
  )
);

const link = Command.make(
  "link",
  {
    access: Flag.Literals("access", ReviewLinkAccessSchema.literals).pipe(
      Flag.withDescription(
        "What the link lets whoever opens it do: view, comment or approve."
      ),
      Flag.withDefault("comment")
    ),
    hours: Flag.Int("hours").pipe(
      Flag.withMetavar("<hours>"),
      Flag.withDescription(
        `How long the link works, in hours: 14 days when left out, ${String(maxReviewLinkHours)} hours (90 days) at most.`
      ),
      Flag.optional
    ),
    postId: postArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("review.link")(function* link({
    access,
    hours,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    if (
      Option.isSome(hours) &&
      (hours.value < 1 || hours.value > maxReviewLinkHours)
    ) {
      yield* new Refused({
        reason: `--hours is between 1 and ${String(maxReviewLinkHours)}.`,
      });
    }

    const made = yield* client.review
      .createLink({
        params: { postId, workspaceId: workspace.id },
        payload: Option.match(hours, {
          onNone: () => ({ access }),
          onSome: (expiresInHours) => ({ access, expiresInHours }),
        }),
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Review link ${made.link.id} for post ${postId}, until ${instant(made.link.expiresAt)}:`
    );
    yield* Console.log(`  ${made.url}`);
    yield* Console.log(
      `It lets whoever opens it ${accesses[made.link.access]}, without an account. It is not shown again: peal review revoke ${made.link.id} ends it.`
    );
  })
).pipe(
  Command.withDescription(
    "Make a link that shows a post to someone without an account, and print its address, once. Needs the right to approve posts."
  )
);

const revoke = Command.make(
  "revoke",
  {
    linkId: Argument.String("link-id").pipe(
      Argument.withDescription("The link, as peal review links shows its id.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("review.revoke")(function* revoke({ linkId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.review
      .revokeLink({ params: { linkId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Revoked review link ${linkId}: whoever opens it is told it no longer works.`
    );
  })
).pipe(Command.withDescription("End a review link at once."));

export const review = Command.make("review").pipe(
  Command.withDescription(
    "A post's review: its comments and approvals, and the links that show it to people without an account."
  ),
  Command.withSubcommands([show, comment, links, link, revoke])
);
