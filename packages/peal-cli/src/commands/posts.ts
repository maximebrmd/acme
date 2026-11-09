import { TargetConfirmationSchema } from "acme-contract";
import type { FailureReason, Post, PostTarget } from "acme-contract";
import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

const postArgument = Argument.String("post-id").pipe(
  Argument.withDescription(
    "The post, as the web app or acme drafts list shows its id."
  )
);

const targetArgument = Argument.String("target-id").pipe(
  Argument.withDescription(
    "The post on one of its channels, as acme posts show lists it."
  )
);

const whenOf = (post: Post): string => {
  if (post.schedule === null) {
    return "";
  }

  return `, for ${instant(post.schedule.at)} (${post.schedule.timeZone})`;
};

// Why a post did not go out on a channel, as the user acts on it. Every
// reason has its sentence, so a new one fails to compile until it has one.
const failureReasons: Readonly<Record<FailureReason, string>> = {
  appNotAudited:
    "the platform takes only private posts from this server's app until it audits it: make the account private and the post visible to its owner only",
  channelDisabled:
    "the channel was turned off: disconnect it and connect the account again, then schedule the post anew",
  channelDisconnected: "the channel was disconnected before it went out",
  contentRejected: "the platform refused its text or its format",
  mediaRejected: "the platform refused one of its images or videos",
  mediaRemoved: "one of its images or videos was deleted before it went out",
  missed: "Acme was down at its time, and it came too late to send",
  notPublished: "someone checked the platform and did not find it",
  quotaExceeded:
    "the platform's daily upload allowance stayed spent: post it again after it resets",
  rateLimited: "the platform kept limiting Acme, which stopped trying",
  tokenExpired: "the account's authorization stopped working: reconnect it",
  unavailable: "the platform could not be reached",
};

const targetDetail = (target: PostTarget): string => {
  if (target.status === "failed" && target.failureReason !== null) {
    return `failed: ${target.failureReason} (${failureReasons[target.failureReason]})`;
  }

  if (target.status === "unconfirmed" && target.unconfirmedReason !== null) {
    return `unconfirmed: ${target.unconfirmedReason}`;
  }

  if (target.status === "published") {
    const published =
      target.keptPrivate === true
        ? "published, but the platform kept it private: change its visibility there"
        : "published";

    return target.permalink === null
      ? published
      : `${published} at ${target.permalink}`;
  }

  return target.status;
};

const targetOf = (post: Post, targetId: string) =>
  Option.fromUndefinedOr(post.targets.find(({ id }) => id === targetId));

const show = Command.make(
  "show",
  { postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.show")(function* show({ postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const post = yield* client.posts
      .get({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const names = yield* channelNames(client, workspace.id);

    const status =
      post.outcome === null ? post.status : `${post.status} (${post.outcome})`;

    yield* Console.log(
      `Post ${post.id} in ${workspace.name}: ${status}${whenOf(post)}.`
    );
    yield* Console.log(`  ${excerpt(post.content.text)}`);

    if (post.targets.length === 0) {
      yield* Console.log("It is for no channel yet.");

      return;
    }

    yield* Console.log("Channels:");

    for (const line of columns(
      post.targets.map((target) => [
        `  ${target.id}`,
        named(names, target.channelId),
        `round ${String(target.round)}`,
        targetDetail(target),
      ])
    )) {
      yield* Console.log(line);
    }

    for (const target of post.targets) {
      if (target.options !== null) {
        yield* Console.log(
          `Options on ${named(names, target.channelId)}: ${JSON.stringify(target.options)}`
        );
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show a post: its status and time, how it went on each channel, with the target ids repost and confirm take, and its options on the platforms that ask for more."
  )
);

const unschedule = Command.make(
  "unschedule",
  { postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.unschedule")(function* unschedule({
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.posts
      .unschedule({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Took post ${postId} back to draft: it goes out at no time until it is scheduled again.`
    );
  })
).pipe(
  Command.withDescription(
    "Take a scheduled post back to draft, so it goes out at no time and can change. A post already publishing cannot."
  )
);

const repost = Command.make(
  "repost",
  { postId: postArgument, targetId: targetArgument, workspace: workspaceFlag },
  Effect.fn("posts.repost")(function* repost({
    postId,
    targetId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const post = yield* client.posts
      .repost({ params: { postId, targetId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const names = yield* channelNames(client, workspace.id);

    yield* Option.match(targetOf(post, targetId), {
      onNone: () => Console.log(`Posting ${postId} again, now.`),
      onSome: (target) =>
        Console.log(
          `Posting ${postId} again on ${named(names, target.channelId)}, now: round ${String(target.round)}.`
        ),
    });
  })
).pipe(
  Command.withDescription(
    "Send a post again, now, on one channel where it failed or is unconfirmed. Check the platform first when it is unconfirmed: it may be live already."
  )
);

const decodeConfirmation = Schema.decodeUnknownEffect(TargetConfirmationSchema);

// Arguments are read in the order of their keys: the post, its target,
// then what the user found.
const confirm = Command.make(
  "confirm",
  {
    permalink: Flag.String("permalink").pipe(
      Flag.withMetavar("<url>"),
      Flag.withDescription(
        "The post's address on the platform, when it is live."
      ),
      Flag.optional
    ),
    postId: postArgument,
    targetId: targetArgument,
    verdict: Argument.Literals("outcome", ["published", "not-published"]).pipe(
      Argument.withDescription(
        "What you found on the platform: published, or not-published."
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("posts.confirm")(function* confirm(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    if (input.verdict === "not-published" && Option.isSome(input.permalink)) {
      yield* new Refused({
        reason: "--permalink is for a post you found live: leave it out.",
      });
    }

    const payload = yield* decodeConfirmation(
      input.verdict === "published"
        ? { _tag: "published", permalink: Option.getOrNull(input.permalink) }
        : { _tag: "notPublished" }
    ).pipe(
      Effect.mapError(
        () =>
          new Refused({
            reason:
              "--permalink must be the post's http or https address, 2048 characters at most.",
          })
      )
    );

    const post = yield* client.posts
      .confirm({
        params: {
          postId: input.postId,
          targetId: input.targetId,
          workspaceId: workspace.id,
        },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    const names = yield* channelNames(client, workspace.id);

    const channel = targetOf(post, input.targetId).pipe(
      Option.map(({ channelId }) => named(names, channelId)),
      Option.getOrElse(() => "its channel")
    );

    yield* Console.log(
      input.verdict === "published"
        ? `Recorded that post ${input.postId} went out on ${channel}.`
        : `Recorded that post ${input.postId} did not go out on ${channel}: acme posts repost ${input.postId} ${input.targetId} sends it again.`
    );
  })
).pipe(
  Command.withDescription(
    "Say what you found on the platform for a post Acme could not confirm on one channel: published, or not-published, which fails it there so it can be sent again."
  )
);

export const posts = Command.make("posts").pipe(
  Command.withDescription(
    "A workspace's posts once scheduled: how they went, taking them back to draft, and following up where they failed."
  ),
  Command.withSubcommands([show, unschedule, repost, confirm])
);
