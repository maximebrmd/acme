import { maxDraftPageSize, PostDraftSchema } from "acme-contract";
import type { Post, PostDraft } from "acme-contract";
import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, excerpt } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

// A draft that breaks the contract's own limits is refused before it is
// sent, rather than read as a broken answer.
const checkDraft = (draft: PostDraft) =>
  Schema.decodeUnknownEffect(PostDraftSchema)(draft).pipe(
    Effect.mapError(
      (failure) =>
        new Refused({
          reason: `The draft does not fit: ${failure.message}`,
        })
    )
  );

const list = Command.make(
  "list",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Where the page before ended, as it printed."),
      Flag.optional
    ),
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many drafts a page holds, at most ${String(maxDraftPageSize)}.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("drafts.list")(function* list({
    cursor,
    limit,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const page = yield* client.posts
      .drafts({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(cursor, {
            onNone: () => ({}),
            onSome: (after) => ({ cursor: after }),
          }),
          ...Option.match(limit, {
            onNone: () => ({}),
            onSome: (size) => ({
              limit: Math.min(Math.max(size, 1), maxDraftPageSize),
            }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (page.items.length === 0) {
      yield* Console.log(`${workspace.name} has no drafts.`);

      return;
    }

    yield* Console.log(`Drafts of ${workspace.name}, newest first:`);

    for (const line of columns(
      page.items.map((draft) => [
        `  ${draft.id}`,
        plural(draft.targets.length, "channel", "channels"),
        excerpt(draft.content.text),
      ])
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: acme drafts list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(Command.withDescription("List the workspace's drafts, newest first."));

const save = Command.make(
  "save",
  {
    channels: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "A channel the post is for, as acme channels list shows its id; repeat it for several. A draft you change keeps its channels without it."
      ),
      Flag.atLeast(0)
    ),
    postId: Flag.String("post").pipe(
      Flag.withMetavar("<post-id>"),
      Flag.withDescription("The draft to change. Without it, a new draft."),
      Flag.optional
    ),
    text: Flag.String("text").pipe(
      Flag.withDescription(
        "What the post says. A draft you change keeps its text without it."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("drafts.save")(function* save(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const params = { workspaceId: workspace.id };

    const saved: Post = yield* Option.match(input.postId, {
      onNone: () =>
        checkDraft({
          channelIds: input.channels,
          content: {
            media: [],
            overrides: [],
            text: Option.getOrElse(input.text, () => ""),
          },
        }).pipe(
          Effect.flatMap((payload) =>
            client.posts
              .create({ params, payload })
              .pipe(Effect.mapError(explain(url)))
          )
        ),
      // What the flags leave out stays as the draft has it: its media,
      // and its text on some channels.
      onSome: (postId) =>
        client.posts.get({ params: { ...params, postId } }).pipe(
          Effect.mapError(explain(url)),
          Effect.flatMap((draft) =>
            checkDraft({
              channelIds:
                input.channels.length > 0
                  ? input.channels
                  : draft.targets.map(({ channelId }) => channelId),
              content: {
                ...draft.content,
                text: Option.getOrElse(input.text, () => draft.content.text),
              },
            })
          ),
          Effect.flatMap((payload) =>
            client.posts
              .update({ params: { ...params, postId }, payload })
              .pipe(Effect.mapError(explain(url)))
          )
        ),
    });

    yield* Console.log(
      `Saved draft ${saved.id} in ${workspace.name}, for ${plural(saved.targets.length, "channel", "channels")}.`
    );
  })
).pipe(
  Command.withDescription(
    "Write a new draft, or change one: its text and channels. Scheduling it is for the web app."
  )
);

const discard = Command.make(
  "discard",
  {
    postId: Argument.String("post-id").pipe(
      Argument.withDescription("The draft, as acme drafts list shows its id.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("drafts.discard")(function* discard({ postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.posts
      .discard({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Discarded draft ${postId} of ${workspace.name}.`);
  })
).pipe(
  Command.withDescription(
    "Delete a draft for good. A post scheduled or sent is not a draft: unschedule or cancel it instead."
  )
);

export const drafts = Command.make("drafts").pipe(
  Command.withDescription(
    "A workspace's drafts: posts that go out at no time yet."
  ),
  Command.withSubcommands([list, save, discard])
);
