import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { LivePostChangeSchema, maxOutcomeWaitSeconds } from "peal-contract";
import type { Channel } from "peal-contract";

import { changeLine, targetsOn } from "#commands/posts-unpublish.ts";
import { explain, explainingPublishing } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { channelName } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, named, workspaceFlag } from "#workspace.ts";

// Arguments are read in the order of their keys.
export const edit = Command.make(
  "edit",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<id-or-handle>"),
      Flag.withDescription(
        'The channel of the post to edit: its id, its exact handle, or its platform and handle ("mastodon peal@social.example"); a handle two of its channels share is refused.'
      )
    ),
    json: jsonFlag,
    part: Flag.Int("part").pipe(
      Flag.withMetavar("<n>"),
      Flag.withDescription(
        "The part of a thread to edit, from 0 (the post itself, the default)."
      ),
      Flag.withDefault(0)
    ),
    postId: Argument.String("post-id").pipe(
      Argument.withDescription(
        "The post, as the web app or peal posts list shows its id."
      )
    ),
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        "The new text of that part on that channel. It is checked as the channel's text is when a post is scheduled."
      )
    ),
    wait: Flag.Int("wait").pipe(
      Flag.withMetavar("<seconds>"),
      Flag.withDescription(
        `Wait up to that many seconds, ${String(maxOutcomeWaitSeconds)} at most, for the edit to end, then say how it went. It goes on either way: peal posts changes says how.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("posts.edit")(function* editPost(input) {
    if (input.part < 0) {
      return yield* new Refused({
        reason: "--part counts from 0, the post itself.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const post = yield* client.posts
      .get({ params: { postId: input.postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const channels = yield* client.channels
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.orElseSucceed((): readonly Channel[] => []));

    const names: ReadonlyMap<string, string> = new Map(
      channels.map((channel) => [channel.id, channelName(channel)])
    );

    // One target, or a refusal: never the first of several that match.
    const [target, ...others] = targetsOn(post, channels, input.channel);

    if (target === undefined) {
      return yield* new Refused({
        reason: `Post ${post.id} is not on ${input.channel}: give a channel's id, its handle, or its platform and handle, as peal posts show ${post.id} lists them.`,
      });
    }

    if (others.length > 0) {
      return yield* new Refused({
        reason: `${input.channel} names more than one of the post's channels: ${[
          target,
          ...others,
        ]
          .map(({ channelId }) => named(names, channelId))
          .join(
            ", "
          )}. Give the channel's id, or its platform and handle. Nothing was done.`,
      });
    }

    const change = yield* client.posts
      .editTarget({
        params: {
          postId: post.id,
          targetId: target.id,
          workspaceId: workspace.id,
        },
        payload: { part: input.part, text: input.text },
        query: Option.match(input.wait, {
          onNone: () => ({}),
          onSome: (seconds) => ({
            wait: Math.min(Math.max(seconds, 0), maxOutcomeWaitSeconds),
          }),
        }),
      })
      .pipe(explainingPublishing(url));

    if (input.json) {
      return yield* printJson(LivePostChangeSchema, change);
    }

    return yield* Console.log(changeLine(change, names, post));
  })
).pipe(
  Command.withDescription(
    "Edit the text of a published post on one channel, on Mastodon and Google Business Profile: only the text changes, and the change is public at once. Once done, it is that part's text on that channel in Peal too."
  )
);
