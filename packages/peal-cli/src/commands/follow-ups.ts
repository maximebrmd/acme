import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  FollowUpRulePageSchema,
  FollowUpRuleSchema,
  FollowUpRuleStatusSchema,
  maxFollowUpPageSize,
  maxLikesThreshold,
  minLikesThreshold,
} from "peal-contract";
import type {
  ChannelFollowUps,
  FollowUpRule,
  FollowUpRuleChange,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const ruleArgument = Argument.String("rule").pipe(
  Argument.withDescription(
    "The follow-up rule, by its id, as peal follow-ups list shows it."
  )
);

const likesFlag = Flag.Int("likes").pipe(
  Flag.withMetavar("<count>"),
  Flag.withDescription(
    `The likes a post must have, as Peal's analytics last counted them: ${String(minLikesThreshold)} to ${maxLikesThreshold.toLocaleString("en")}.`
  )
);

const commentFlag = Flag.String("comment").pipe(
  Flag.withMetavar("<text>"),
  Flag.withDescription(
    "The comment to publish under the post, as the account's own reply, once it has the likes."
  ),
  Flag.optional
);

const repostFlag = Flag.Boolean("repost").pipe(
  Flag.withDescription("Also repost the post once it has the likes."),
  Flag.withDefault(false)
);

// The likes a command was given, checked as the server checks them.
const checkedLikes = (likes: number): Effect.Effect<number, Refused> =>
  likes < minLikesThreshold || likes > maxLikesThreshold
    ? Effect.fail(
        new Refused({
          reason: `--likes takes ${String(minLikesThreshold)} to ${String(maxLikesThreshold)}.`,
        })
      )
    : Effect.succeed(likes);

// What a rule does, in a few words.
const summary = (rule: FollowUpRule): string =>
  [
    `at ${String(rule.likes)} likes`,
    rule.comment === null ? undefined : "comment",
    rule.repost ? "repost" : undefined,
    rule.approval === "pending" ? "awaiting approval" : undefined,
    rule.status === "ended"
      ? `ended: ${rule.endedReason ?? "stopped"}`
      : rule.status,
  ]
    .filter((part) => part !== undefined)
    .join(", ");

const scopeOf = (rule: FollowUpRule) =>
  rule.postId === null
    ? `channel ${rule.channelId ?? ""}`
    : `post ${rule.postId}`;

// A channel's line: what it carries, kind by kind.
const channelLine = ({
  channelId,
  comment,
  platform,
  repost,
}: ChannelFollowUps) =>
  `  ${platform} ${channelId}: comment ${comment}, repost ${repost}`;

const printRule = (rule: FollowUpRule, json: boolean, said: string) =>
  json
    ? printJson(FollowUpRuleSchema, rule)
    : Effect.gen(function* printed() {
        yield* Console.log(`${said} (${summary(rule)}): ${rule.id}.`);

        if (rule.comment !== null) {
          yield* Console.log(`  comment: ${excerpt(rule.comment)}`);
        }

        for (const channel of rule.channels) {
          yield* Console.log(channelLine(channel));
        }

        for (const followUp of rule.followUps) {
          yield* Console.log(
            `  ${followUp.kind} on ${followUp.channelId}: ${followUp.status}${
              followUp.reason === null ? "" : ` (${followUp.reason})`
            }${followUp.sentAt === null ? "" : ` at ${instant(followUp.sentAt)}`}${
              followUp.permalink === null ? "" : ` ${followUp.permalink}`
            }`
          );
        }
      });

const list = Command.make(
  "list",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withDescription("Where the page starts: the More: line's cursor."),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many rules a page holds, ${String(maxFollowUpPageSize)} at most.`
      ),
      Flag.optional
    ),
    post: Flag.String("post").pipe(
      Flag.withMetavar("<id>"),
      Flag.withDescription("Only the rules of this post."),
      Flag.optional
    ),
    status: Flag.Literals("status", FollowUpRuleStatusSchema.literals).pipe(
      Flag.withDescription("Only the rules with this status."),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("followUps.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const query = {
      ...Option.match(input.cursor, {
        onNone: () => ({}),
        onSome: (cursor) => ({ cursor }),
      }),
      ...Option.match(input.limit, {
        onNone: () => ({}),
        onSome: (limit) => ({ limit }),
      }),
      ...Option.match(input.post, {
        onNone: () => ({}),
        onSome: (postId) => ({ postId }),
      }),
      ...Option.match(input.status, {
        onNone: () => ({}),
        onSome: (status) => ({ status }),
      }),
    };

    const page = yield* client.followUps
      .list({ params: { workspaceId: workspace.id }, query })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(FollowUpRulePageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `${workspace.name} follows no post up: peal follow-ups start makes a rule.`
      );

      return;
    }

    yield* Console.log(`Follow-up rules of ${workspace.name}:`);

    for (const rule of page.items) {
      yield* Console.log(`  ${rule.id}  ${scopeOf(rule)}  ${summary(rule)}`);
    }

    if (page.nextCursor !== null) {
      const asked = [
        ...Option.toArray(input.post).map((it) => ` --post ${it}`),
        ...Option.toArray(input.status).map((it) => ` --status ${it}`),
        ...Option.toArray(input.limit).map((it) => ` --limit ${String(it)}`),
      ].join("");

      yield* Console.log(
        `More: peal follow-ups list --workspace ${workspace.slug}${asked} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's follow-up rules: what each acts on, the likes it waits for, what it sends and where it is."
  )
);

const show = Command.make(
  "show",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  Effect.fn("followUps.show")(function* show(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const rule = yield* client.followUps
      .get({ params: { ruleId: input.rule, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* printRule(rule, input.json, `Rule on ${scopeOf(rule)}`);
  })
).pipe(
  Command.withDescription(
    "Show a follow-up rule, what each of its channels can carry, and what it did: each follow-up, sent, waiting or why not."
  )
);

const start = Command.make(
  "start",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<id>"),
      Flag.withDescription(
        "The channel whose posts, published from now on, the rule acts on, instead of one post."
      ),
      Flag.optional
    ),
    comment: commentFlag,
    json: jsonFlag,
    likes: likesFlag,
    post: Flag.String("post").pipe(
      Flag.withMetavar("<id>"),
      Flag.withDescription(
        "The post the rule acts on, on each of its channels."
      ),
      Flag.optional
    ),
    repost: repostFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("followUps.start")(function* start(input) {
    if (Option.isSome(input.post) === Option.isSome(input.channel)) {
      return yield* new Refused({
        reason: "Give --post or --channel, one of them: what the rule acts on.",
      });
    }

    if (Option.isNone(input.comment) && !input.repost) {
      return yield* new Refused({
        reason: "Give --comment, --repost or both: what the rule does.",
      });
    }

    const likes = yield* checkedLikes(input.likes);
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const payload = {
      likes,
      repost: input.repost,
      ...Option.match(input.post, {
        onNone: () => ({}),
        onSome: (postId) => ({ postId }),
      }),
      ...Option.match(input.channel, {
        onNone: () => ({}),
        onSome: (channelId) => ({ channelId }),
      }),
      ...Option.match(input.comment, {
        onNone: () => ({}),
        onSome: (comment) => ({ comment }),
      }),
    };

    const rule = yield* client.followUps
      .create({ params: { workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    return yield* printRule(rule, input.json, `Following up ${scopeOf(rule)}`);
  })
).pipe(
  Command.withDescription(
    "Make a rule that follows the workspace's own posts up once they have --likes likes: --comment publishes a comment under the post as the account's own reply, --repost reposts it, once each, within seven days of the post going live. Comments go out on Bluesky, Mastodon and X, reposts on Bluesky and Mastodon. It publishes, in public, without anyone being asked each time; where the workspace asks for approvals, it waits for one."
  )
);

const update = Command.make(
  "update",
  {
    comment: commentFlag,
    json: jsonFlag,
    likes: Flag.Int("likes").pipe(
      Flag.withMetavar("<count>"),
      Flag.withDescription("The likes a post must have from now on."),
      Flag.optional
    ),
    noComment: Flag.Boolean("no-comment").pipe(
      Flag.withDescription("Take the comment away."),
      Flag.withDefault(false)
    ),
    noRepost: Flag.Boolean("no-repost").pipe(
      Flag.withDescription("Stop reposting."),
      Flag.withDefault(false)
    ),
    repost: Flag.Boolean("repost").pipe(
      Flag.withDescription("Repost too."),
      Flag.withDefault(false)
    ),
    rule: ruleArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("followUps.update")(function* update(input) {
    const payload: {
      -readonly [K in keyof FollowUpRuleChange]: FollowUpRuleChange[K];
    } = {};

    if (Option.isSome(input.comment) || input.noComment) {
      payload.comment = Option.getOrNull(input.comment);
    }

    if (Option.isSome(input.likes)) {
      payload.likes = yield* checkedLikes(input.likes.value);
    }

    if (input.repost || input.noRepost) {
      payload.repost = input.repost;
    }

    if (Object.keys(payload).length === 0) {
      return yield* new Refused({
        reason:
          "Give --likes, --comment, --no-comment, --repost, --no-repost or several: nothing else of a rule changes.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const rule = yield* client.followUps
      .update({
        params: { ruleId: input.rule, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    return yield* printRule(rule, input.json, `Rule ${rule.id} changed`);
  })
).pipe(
  Command.withDescription(
    "Change a rule's likes, its comment or whether it reposts. What it sent stays as it is."
  )
);

const pausing = (paused: boolean) =>
  Effect.fn("followUps.pause")(function* pause(input: {
    readonly json: boolean;
    readonly rule: string;
    readonly workspace: Option.Option<string>;
  }) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const rule = yield* client.followUps
      .update({
        params: { ruleId: input.rule, workspaceId: workspace.id },
        payload: { paused },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* printRule(
      rule,
      input.json,
      `${paused ? "Paused" : "Resumed"} rule ${rule.id}`
    );
  });

const pause = Command.make(
  "pause",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  pausing(true)
).pipe(
  Command.withDescription(
    "Pause a rule: it sends nothing until it is resumed, and what it armed expires with its window meanwhile."
  )
);

const resume = Command.make(
  "resume",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  pausing(false)
).pipe(Command.withDescription("Set a paused rule going again."));

const approve = Command.make(
  "approve",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  Effect.fn("followUps.approve")(function* approve(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const rule = yield* client.followUps
      .approve({ params: { ruleId: input.rule, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* printRule(rule, input.json, `Approved rule ${rule.id}`);
  })
).pipe(
  Command.withDescription(
    "Approve what a rule sends, for a rule whose starter's posts wait for an approval. Takes a member who approves posts, signed in: an API key never approves."
  )
);

const stop = Command.make(
  "stop",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  Effect.fn("followUps.stop")(function* stop(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    yield* client.followUps
      .delete({ params: { ruleId: input.rule, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(
          `Stopped rule ${input.rule}: it sends nothing more, and what it sent stays on the platforms.`
        );
  })
).pipe(
  Command.withDescription(
    "Stop a rule for good: what it armed and did not send is given up; what it sent stays on the platforms."
  )
);

export const followUps = Command.make("follow-ups").pipe(
  Command.withDescription(
    "Rules that follow the workspace's own posts up once they have enough likes: a comment under the post and a repost of it, once each. They never like, follow or message anyone."
  ),
  Command.withSubcommands([
    list,
    show,
    start,
    update,
    pause,
    resume,
    approve,
    stop,
  ])
);
