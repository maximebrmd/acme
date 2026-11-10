import {
  Array as Arr,
  Console,
  DateTime,
  Effect,
  Option,
  Schema,
} from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  PostSchema,
  PublicationAttemptSchema,
  TargetConfirmationSchema,
} from "peal-contract";
import type { FailureReason, Post, PostTarget } from "peal-contract";

import { explain, explainingPublishing } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { channelIdsOf, channelsFlag } from "#post-flags.ts";
import { channelsOf, namesFor, printPost, timeOf } from "#post-result.ts";
import { columns, excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { atFlag, instantOf, timeZoneFlag } from "#when.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

const postArgument = Argument.String("post-id").pipe(
  Argument.withDescription(
    "The post, as the web app or peal drafts list shows its id."
  )
);

const targetArgument = Argument.String("target-id").pipe(
  Argument.withDescription(
    "The post on one of its channels, as peal posts show lists it."
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
  appBillingLimit:
    "the platform refused this server's app until its operator pays for it: the post is not at fault, post it again once that is fixed",
  appNotAudited:
    "the platform takes only private posts from this server's app until it audits it: make the account private and the post visible to its owner only",
  channelDisabled:
    "the channel was turned off: disconnect it and connect the account again, then schedule the post anew",
  channelDisconnected: "the channel was disconnected before it went out",
  contentRejected: "the platform refused its text or its format",
  mediaRejected: "the platform refused one of its images or videos",
  mediaRemoved: "one of its images or videos was deleted before it went out",
  missed: "Peal was down at its time, and it came too late to send",
  notPublished: "someone checked the platform and did not find it",
  planLimit:
    "the workspace's plan had no room for it when it was due: disconnect channels or move to a larger plan, then post it again",
  quotaExceeded:
    "the platform's daily upload allowance stayed spent: post it again after it resets",
  rateLimited: "the platform kept limiting Peal, which stopped trying",
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
  { json: jsonFlag, postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.show")(function* show({ json, postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const post = yield* client.posts
      .get({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(PostSchema, post);

      return;
    }

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

const instantFlag = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withSchema(Schema.DateTimeUtcFromString),
    Flag.withMetavar("<instant>"),
    Flag.withDescription(description),
    Flag.optional
  );

// How far ahead the list looks unless told: a month.
const defaultListDays = 31;

const list = Command.make(
  "list",
  {
    from: instantFlag(
      "from",
      "The first instant, included, with its offset, such as 2026-11-20T00:00:00Z. Defaults to now."
    ),
    json: jsonFlag,
    to: instantFlag(
      "to",
      `The last instant, excluded, at most 62 days after --from. Defaults to ${String(defaultListDays)} days after it.`
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("posts.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const now = yield* DateTime.now;
    const from = Option.getOrElse(input.from, () => now);

    const to = Option.getOrElse(input.to, () =>
      DateTime.add(from, { days: defaultListDays })
    );

    const found = yield* client.posts
      .list({ params: { workspaceId: workspace.id }, query: { from, to } })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(Schema.Array(PostSchema), found);

      return;
    }

    if (found.length === 0) {
      yield* Console.log(
        `${workspace.name} has no post scheduled from ${instant(from)} to ${instant(to)}.`
      );

      return;
    }

    yield* Console.log(
      `Posts of ${workspace.name} scheduled from ${instant(from)} to ${instant(to)}:`
    );

    for (const line of columns(
      found.map((post) => [
        `  ${post.id}`,
        post.outcome === null
          ? post.status
          : `${post.status} (${post.outcome})`,
        timeOf(post),
        excerpt(post.content.text),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the posts scheduled over a range of time, by scheduled instant, cancelled ones included. Drafts have no time: peal drafts list shows them."
  )
);

const attempts = Command.make(
  "attempts",
  { json: jsonFlag, postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.attempts")(function* attempts({
    json,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.posts
      .attempts({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(PublicationAttemptSchema), found);

      return;
    }

    if (found.length === 0) {
      yield* Console.log(`Peal has made no attempt at post ${postId} yet.`);

      return;
    }

    yield* Console.log(`Attempts at post ${postId} of ${workspace.name}:`);

    for (const line of columns(
      found.map((attempt) => [
        `  ${attempt.targetId}`,
        `round ${String(attempt.round)}`,
        `attempt ${String(attempt.attempt)}`,
        instant(attempt.startedAt),
        attempt.refusalCode === null
          ? attempt.result
          : `${attempt.result} (${attempt.refusalCode})`,
        attempt.retryAt === null ? "" : `retried ${instant(attempt.retryAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List every attempt Peal made at publishing a post, by channel, round and attempt: how each ended, and the code behind a refusal, the platform's own or Peal's."
  )
);

const unschedule = Command.make(
  "unschedule",
  { json: jsonFlag, postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.unschedule")(function* unschedule({
    json,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const post = yield* client.posts
      .unschedule({ params: { postId, workspaceId: workspace.id } })
      .pipe(explainingPublishing(url));

    yield* printPost(
      post,
      json,
      () =>
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
  {
    json: jsonFlag,
    postId: postArgument,
    targetId: targetArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("posts.repost")(function* repost({
    json,
    postId,
    targetId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const post = yield* client.posts
      .repost({ params: { postId, targetId, workspaceId: workspace.id } })
      .pipe(explainingPublishing(url));

    if (json) {
      yield* printJson(PostSchema, post);

      return;
    }

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
    json: jsonFlag,
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
      .pipe(explainingPublishing(url));

    if (input.json) {
      yield* printJson(PostSchema, post);

      return;
    }

    const names = yield* channelNames(client, workspace.id);

    const channel = targetOf(post, input.targetId).pipe(
      Option.map(({ channelId }) => named(names, channelId)),
      Option.getOrElse(() => "its channel")
    );

    yield* Console.log(
      input.verdict === "published"
        ? `Recorded that post ${input.postId} went out on ${channel}.`
        : `Recorded that post ${input.postId} did not go out on ${channel}: peal posts repost ${input.postId} ${input.targetId} sends it again.`
    );
  })
).pipe(
  Command.withDescription(
    "Say what you found on the platform for a post Peal could not confirm on one channel: published, or not-published, which fails it there so it can be sent again."
  )
);

const schedule = Command.make(
  "schedule",
  {
    at: atFlag,
    channels: channelsFlag(
      "A channel to schedule the draft on, as peal channels list shows its id; repeat it, or separate ids with commas. Without it, the channels the draft has."
    ),
    json: jsonFlag,
    postId: postArgument,
    timeZone: timeZoneFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("posts.schedule")(function* schedule(input) {
    const at = yield* instantOf(input.at, input.timeZone);
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const params = { postId: input.postId, workspaceId: workspace.id };
    const channelIds = channelIdsOf(input.channels);

    const post = yield* (
      Arr.isArrayNonEmpty(channelIds)
        ? client.posts.schedule({
            params,
            payload: { at, channelIds, timeZone: input.timeZone },
          })
        : client.posts.reschedule({
            params,
            payload: { at, timeZone: input.timeZone },
          })
    ).pipe(explainingPublishing(url));

    const names = yield* namesFor(input.json, client, workspace.id);

    yield* printPost(
      post,
      input.json,
      () =>
        `Scheduled post ${post.id} for ${timeOf(post)} on ${channelsOf(post, names)}: it goes out then, to these accounts' public.`
    );
  })
).pipe(
  Command.withDescription(
    "Schedule a draft: at --at it goes out on its channels, to the public of the accounts they connect. Its text, media and options must fit each platform's rules. Until then, peal posts unschedule or cancel stops it."
  )
);

const publish = Command.make(
  "publish",
  {
    json: jsonFlag,
    postId: postArgument,
    timeZone: timeZoneFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("posts.publish")(function* publish(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const post = yield* client.posts
      .reschedule({
        params: { postId: input.postId, workspaceId: workspace.id },
        payload: { at: yield* DateTime.now, timeZone: input.timeZone },
      })
      .pipe(explainingPublishing(url));

    const names = yield* namesFor(input.json, client, workspace.id);

    yield* printPost(
      post,
      input.json,
      () =>
        `Publishing post ${post.id} now on ${channelsOf(post, names)}: it cannot be taken back from here once it is out. peal posts show ${post.id} tells how it went.`
    );
  })
).pipe(
  Command.withDescription(
    "Publish a draft, or a scheduled post, now, on the channels it has: it reaches the public of the accounts they connect, and cannot be taken back from Peal once it is out."
  )
);

const reschedule = Command.make(
  "reschedule",
  {
    at: atFlag,
    json: jsonFlag,
    postId: postArgument,
    timeZone: timeZoneFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("posts.reschedule")(function* reschedule(input) {
    const at = yield* instantOf(input.at, input.timeZone);
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const post = yield* client.posts
      .reschedule({
        params: { postId: input.postId, workspaceId: workspace.id },
        payload: { at, timeZone: input.timeZone },
      })
      .pipe(explainingPublishing(url));

    const names = yield* namesFor(input.json, client, workspace.id);

    yield* printPost(
      post,
      input.json,
      () =>
        `Moved post ${post.id} to ${timeOf(post)}, on ${channelsOf(post, names)}.`
    );
  })
).pipe(
  Command.withDescription(
    "Move a scheduled post to another time. A draft is scheduled then, on the channels it has."
  )
);

const cancel = Command.make(
  "cancel",
  { json: jsonFlag, postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.cancel")(function* cancel({
    json,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const post = yield* client.posts
      .cancel({ params: { postId, workspaceId: workspace.id } })
      .pipe(explainingPublishing(url));

    yield* printPost(post, json, () =>
      post.status === "cancelled"
        ? `Cancelled post ${post.id}: it goes out on no channel.`
        : `Post ${post.id} was already ${post.status}: the channels it was not sent to yet are cancelled, and peal posts show ${post.id} tells what the others did.`
    );
  })
).pipe(
  Command.withDescription(
    "Cancel a draft or a scheduled post for good: it goes out on no channel. A post already publishing finishes with what its channels did. To change a scheduled post and keep it, unschedule it instead."
  )
);

export const posts = Command.make("posts").pipe(
  Command.withDescription(
    "A workspace's posts: scheduling a draft, publishing it now, moving, cancelling or taking it back to draft, how it went, and following up where it failed. peal post writes and sends one in a single command."
  ),
  Command.withSubcommands([
    list,
    show,
    attempts,
    schedule,
    publish,
    reschedule,
    unschedule,
    cancel,
    repost,
    confirm,
  ])
);
