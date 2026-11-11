import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  LivePostChangeSchema,
  LivePostChangesSchema,
  maxOutcomeWaitSeconds,
  PostUnpublishSchema,
} from "peal-contract";
import type { LivePostChange, Post, PostTarget } from "peal-contract";

import { confirmed, neverAsksInJson, yesFlagName } from "#confirm.ts";
import { explain, explainingPublishing } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { livePostRefusalWords } from "#live-post-refusals.ts";
import { instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

const postArgument = Argument.String("post-id").pipe(
  Argument.withDescription(
    "The post, as the web app or peal posts list shows its id."
  )
);

const changeLine = (
  change: LivePostChange,
  names: ReadonlyMap<string, string>,
  post: Post
) => {
  const channel = Option.fromUndefinedOr(
    post.targets.find(({ id }) => id === change.targetId)
  ).pipe(
    Option.map(({ channelId }) => named(names, channelId)),
    Option.getOrElse(() => change.targetId)
  );

  if (change.status === "done") {
    return `Deleted from ${channel}${change.finishedAt === null ? "" : ` on ${instant(change.finishedAt)}`}${change.alreadyGone === true ? " (a part was gone already)" : ""}.`;
  }

  if (change.status === "failed") {
    return `Could not delete it from ${channel} (${change.code ?? "unknown"}), with ${String(change.partsLeft)} part(s) left: it may still be there. Ask again to delete what is left.`;
  }

  return `Deleting it from ${channel}: ${String(change.partsLeft)} part(s) left. peal posts changes ${change.postId} says how it goes.`;
};

// The target `channel` names, by channel id or by the channel's handle or
// name as the workspace's channels list shows it.
const targetOn = (
  post: Post,
  names: ReadonlyMap<string, string>,
  channel: string
): Option.Option<PostTarget> => {
  const wanted = channel.replace(/^@/u, "").toLowerCase();

  return Option.fromUndefinedOr(
    post.targets.find(
      ({ channelId }) =>
        channelId === channel ||
        (names.get(channelId) ?? "")
          .toLowerCase()
          .split(/[\s()]+/u)
          .some((word) => word.replace(/^@/u, "") === wanted)
    )
  );
};

// Arguments are read in the order of their keys.
export const unpublish = Command.make(
  "unpublish",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<id-or-handle>"),
      Flag.withDescription(
        "Only this channel of the post, by its id or its handle; without it, every channel where the post can be deleted."
      ),
      Flag.optional
    ),
    json: jsonFlag,
    postId: postArgument,
    wait: Flag.Int("wait").pipe(
      Flag.withMetavar("<seconds>"),
      Flag.withDescription(
        `With --channel, wait up to that many seconds, ${String(maxOutcomeWaitSeconds)} at most, for the deletion to end, then say how it went. It goes on either way: peal posts changes says how.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
    yes: Flag.Boolean(yesFlagName).pipe(
      Flag.withDescription(
        "The person who decides agreed to delete the post from the platform for everyone: do not ask again."
      ),
      Flag.withDefault(false)
    ),
  },
  Effect.fn("posts.unpublish")(function* unpublishPost(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "it deletes the post from the platform for everyone, and it cannot be undone",
      yes: input.yes,
    });

    if (Option.isSome(input.wait) && Option.isNone(input.channel)) {
      yield* new Refused({
        reason: "--wait goes with --channel: name the channel to wait for.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const post = yield* client.posts
      .get({ params: { postId: input.postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const names = yield* channelNames(client, workspace.id);

    const target = yield* Option.match(input.channel, {
      onNone: () => Effect.succeedNone,
      onSome: (channel) =>
        Option.match(targetOn(post, names, channel), {
          onNone: () =>
            Effect.fail(
              new Refused({
                reason: `Post ${post.id} is not on ${channel}: peal posts show ${post.id} lists its channels.`,
              })
            ),
          onSome: (found) => Effect.succeed(Option.some(found)),
        }),
    });

    const where = Option.match(target, {
      onNone: () => "from every channel's platform where it can be",
      onSome: ({ channelId }) => `from ${named(names, channelId)}`,
    });

    if (!input.json) {
      yield* Console.log(
        `This deletes post ${post.id} ${where}, for everyone. It cannot be undone from Peal.`
      );
    }

    yield* confirmed({ question: "Delete it?", yes: input.yes });

    if (Option.isSome(target)) {
      const change = yield* client.posts
        .unpublishTarget({
          params: {
            postId: post.id,
            targetId: target.value.id,
            workspaceId: workspace.id,
          },
          query: Option.match(input.wait, {
            onNone: () => ({}),
            onSome: (seconds) => ({
              wait: Math.min(Math.max(seconds, 0), maxOutcomeWaitSeconds),
            }),
          }),
        })
        .pipe(explainingPublishing(url));

      if (input.json) {
        yield* printJson(LivePostChangeSchema, change);

        return;
      }

      yield* Console.log(changeLine(change, names, post));

      return;
    }

    const made = yield* client.posts
      .unpublish({ params: { postId: post.id, workspaceId: workspace.id } })
      .pipe(explainingPublishing(url));

    if (input.json) {
      yield* printJson(PostUnpublishSchema, made);

      return;
    }

    for (const change of made.changes) {
      yield* Console.log(changeLine(change, names, post));
    }

    for (const { reason, targetId } of made.refused) {
      const channel = Option.fromUndefinedOr(
        post.targets.find(({ id }) => id === targetId)
      ).pipe(
        Option.map(({ channelId }) => named(names, channelId)),
        Option.getOrElse(() => targetId)
      );

      yield* Console.log(
        `Not deleted from ${channel}: ${livePostRefusalWords[reason]}.`
      );
    }
  })
).pipe(
  Command.withDescription(
    "Delete a published post from the platforms, for everyone: every part of a thread, the last first. It cannot be undone from Peal. Asks first, unless --yes; with --json, --yes is required. The post stays published in Peal, with when it was removed."
  )
);

export const changes = Command.make(
  "changes",
  { json: jsonFlag, postId: postArgument, workspace: workspaceFlag },
  Effect.fn("posts.changes")(function* listChanges(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const params = { postId: input.postId, workspaceId: workspace.id };

    const listed = yield* client.posts
      .changes({ params })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(LivePostChangesSchema, listed);

      return;
    }

    if (listed.items.length === 0) {
      yield* Console.log(
        `Nothing was asked of post ${input.postId} once live.`
      );

      return;
    }

    const post = yield* client.posts
      .get({ params })
      .pipe(Effect.mapError(explain(url)));

    const names = yield* channelNames(client, workspace.id);

    for (const change of listed.items) {
      yield* Console.log(
        `${instant(change.requestedAt)}  ${changeLine(change, names, post)}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List what was asked of a post once it was live (deleting it from a channel's platform), newest first, and where each stands."
  )
);
