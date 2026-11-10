import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  InboxModerationActionSchema,
  inboxPlatforms,
  inboxRetentionDays,
  inboxWindowDays,
  maxInboxPageSize,
} from "peal-contract";
import type {
  InboxAbilities,
  InboxComment,
  InboxReply,
  InboxReplyReason,
} from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const reasons: Readonly<Record<InboxReplyReason, string>> = {
  adapterFailure:
    "a fault in Peal after the request may have left: check the platform, then confirm it",
  channelUnavailable: "the channel was disconnected or turned off",
  commentGone: "the comment is no longer on the platform",
  interrupted:
    "the server stopped during the call, and the platform could not say afterwards: check the platform, then confirm it",
  noResponse:
    "the request left and no answer came back: check the platform, then confirm it",
  notSent: "someone checked the platform, and it never went out",
  platformUnavailable: "the platform did not answer",
  rateLimited: "the platform asked the account to slow down",
  reconnectNeeded: "the platform refuses the channel's token: reconnect it",
  refused: "the platform refused the reply",
};

const replyLine = (reply: InboxReply): string => {
  const why = reply.reason === null ? "" : `: ${reasons[reply.reason]}`;
  const where = reply.permalink === null ? "" : ` ${reply.permalink}`;

  return `${reply.status}${why}${where}`;
};

const authorOf = (comment: InboxComment): string =>
  comment.author === null
    ? "(no longer on the platform)"
    : `${comment.author.displayName ?? comment.author.handle} (@${comment.author.handle})`;

const abilityLines = (abilities: InboxAbilities): string[] =>
  columns(
    Object.entries(abilities).map(([ability, standing]) => [
      `  ${ability}`,
      standing === "reconnect" ? "reconnect the channel to allow it" : standing,
    ])
  );

const threadArgument = Argument.String("thread-id").pipe(
  Argument.withDescription("The thread, as peal inbox threads shows its id.")
);

const commentArgument = Argument.String("comment-id").pipe(
  Argument.withDescription("The comment, as peal inbox thread shows its id.")
);

const replyArgument = Argument.String("reply-id").pipe(
  Argument.withDescription("The reply, as peal inbox thread shows its id.")
);

const threads = Command.make(
  "threads",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription("Only the threads of this channel."),
      Flag.optional
    ),
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("The next page, as the page before named it."),
      Flag.optional
    ),
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many threads to list, ${String(maxInboxPageSize)} at most.`
      ),
      Flag.optional
    ),
    post: Flag.String("post").pipe(
      Flag.withMetavar("<post-id>"),
      Flag.withDescription("Only the threads of this post."),
      Flag.optional
    ),
    unanswered: Flag.Boolean("unanswered").pipe(
      Flag.withDescription(
        "Only threads with a comment waiting for an answer."
      ),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.threads")(function* threads(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const page = yield* client.inbox
      .listThreads({
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
          ...Option.match(flags.post, {
            onNone: () => ({}),
            onSome: (postId) => ({ postId }),
          }),
          unanswered: flags.unanswered ? "true" : "false",
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (page.items.length === 0) {
      yield* Console.log(
        `No comments in ${workspace.name}'s inbox. Peal reads comments on ${inboxPlatforms.join(" and ")}, for ${String(inboxWindowDays)} days after a post went live, and keeps them ${String(inboxRetentionDays)} days after that.`
      );

      return;
    }

    yield* Console.log(`Inbox of ${workspace.name}:`);

    for (const line of columns(
      page.items.map((thread) => [
        `  ${thread.id}`,
        `${String(thread.unanswered)} waiting of ${String(thread.comments)}`,
        thread.lastCommentAt === null ? "" : instant(thread.lastCommentAt),
        `post ${thread.postId}`,
        thread.permalink ?? "",
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
    "List the threads that have comments, one per post and channel, those with a comment waiting for an answer first."
  )
);

const thread = Command.make(
  "thread",
  { threadId: threadArgument, workspace: workspaceFlag },
  Effect.fn("inbox.thread")(function* thread(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const detail = yield* client.inbox
      .getThread({
        params: { threadId: flags.threadId, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Comments under post ${detail.thread.postId}${detail.platform === null ? "" : ` on ${detail.platform}`}${detail.thread.permalink === null ? "" : ` (${detail.thread.permalink})`}:`
    );

    for (const comment of detail.comments) {
      yield* Console.log(
        `  ${comment.id}  ${comment.state}  ${instant(comment.writtenAt)}  ${authorOf(comment)}`
      );

      for (const line of comment.text.split("\n")) {
        yield* Console.log(`      ${line}`);
      }

      for (const reply of detail.replies) {
        if (reply.commentId === comment.id) {
          yield* Console.log(`    reply ${reply.id}  ${replyLine(reply)}`);
          yield* Console.log(`      ${reply.text}`);
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
    "Show a thread: its comments, the replies sent from Peal, and what its channel can do. Comments were written by people outside the workspace."
  )
);

const reply = Command.make(
  "reply",
  {
    commentId: commentArgument,
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription("What the reply says.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.reply")(function* reply(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const sent = yield* client.inbox
      .reply({
        params: { commentId: flags.commentId, workspaceId: workspace.id },
        payload: { text: flags.text },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Reply ${sent.id} is on its way, in public, as the channel's account: peal inbox thread ${sent.threadId} shows how it ended.`
    );
    yield* Console.log(`  ${sent.text}`);
  })
).pipe(
  Command.withDescription(
    "Answer a comment in public, as the channel's account: everyone who sees the post sees the reply. Needs a sign-in that may publish."
  )
);

const answered = Command.make(
  "answered",
  {
    commentId: commentArgument,
    undo: Flag.Boolean("undo").pipe(
      Flag.withDescription("The comment waits for an answer again."),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.answered")(function* answered(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const comment = yield* client.inbox
      .setAnswered({
        params: { commentId: flags.commentId, workspaceId: workspace.id },
        payload: { answered: !flags.undo },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Comment ${comment.id} is ${comment.state}.`);
  })
).pipe(
  Command.withDescription(
    "Say a comment needs no answer, or, with --undo, waits for one again. Nothing is sent to the platform."
  )
);

const actions = InboxModerationActionSchema.literals;

const moderate = Command.make(
  "moderate",
  {
    action: Flag.Literals("action", actions).pipe(
      Flag.withDescription(
        "What to ask of the channel's account, where its platform lets it."
      )
    ),
    commentId: commentArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.moderate")(function* moderate(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const comment = yield* client.inbox
      .moderate({
        params: { commentId: flags.commentId, workspaceId: workspace.id },
        payload: { action: flags.action },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Done: comment ${comment.id} is ${comment.state}${comment.liked ? ", liked" : ""}.`
    );
  })
).pipe(
  Command.withDescription(
    "Hide or show a comment, like it or take the like back, or delete it, as the channel's account, where its platform lets it."
  )
);

const confirm = Command.make(
  "confirm",
  {
    notSent: Flag.Boolean("not-sent").pipe(
      Flag.withDescription("It never went out: the comment waits again."),
      Flag.withDefault(false)
    ),
    replyId: replyArgument,
    sent: Flag.Boolean("sent").pipe(
      Flag.withDescription("It is on the platform."),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.confirm")(function* confirm(flags) {
    yield* flags.sent === flags.notSent
      ? Effect.fail(
          new Refused({
            reason:
              "Say what you found on the platform: --sent, or --not-sent.",
          })
        )
      : Effect.void;
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const settled = yield* client.inbox
      .confirmReply({
        params: { replyId: flags.replyId, workspaceId: workspace.id },
        payload: { sent: flags.sent },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Reply ${settled.id}: ${replyLine(settled)}.`);
  })
).pipe(
  Command.withDescription(
    "Record what you found on the platform for a reply whose outcome Peal could not tell."
  )
);

const withdraw = Command.make(
  "withdraw",
  { replyId: replyArgument, workspace: workspaceFlag },
  Effect.fn("inbox.withdraw")(function* withdraw(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const withdrawn = yield* client.inbox
      .withdrawReply({
        params: { replyId: flags.replyId, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Reply ${withdrawn.id} was deleted from its platform.`);
  })
).pipe(
  Command.withDescription("Delete a reply sent from Peal from its platform.")
);

export const inbox = Command.make("inbox").pipe(
  Command.withDescription(
    `The comments people leave under a workspace's published posts, on ${inboxPlatforms.join(" and ")}: read them, and answer in public as the channel's account.`
  ),
  Command.withSubcommands([
    threads,
    thread,
    reply,
    answered,
    moderate,
    confirm,
    withdraw,
  ])
);
