import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  DraftPageSchema,
  maxDraftPageSize,
  PostDraftSchema,
  PostSchema,
} from "peal-contract";
import type { ChannelOptions, Post, PostDraft } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { optionsOf } from "#post-flags.ts";
import { columns, excerpt } from "#print.ts";
import { Refused } from "#refused.ts";
import { tagIdsOf, tagsFlag } from "#tags.ts";
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

// The options a draft goes with: those given replace the draft's on their
// channel; the draft keeps the others it has on the channels it keeps.
const withOptions = (
  channelIds: readonly string[],
  given: readonly ChannelOptions[],
  draft: readonly ChannelOptions[]
): ChannelOptions[] => [
  ...draft.filter(
    ({ channelId }) =>
      channelIds.includes(channelId) &&
      !given.some((chosen) => chosen.channelId === channelId)
  ),
  ...given,
];

const list = Command.make(
  "list",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Where the page before ended, as it printed."),
      Flag.optional
    ),
    json: jsonFlag,
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
    json,
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

    if (json) {
      yield* printJson(DraftPageSchema, page);

      return;
    }

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
        `More: peal drafts list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
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
        "A channel the post is for, as peal channels list shows its id; repeat it for several. A draft you change keeps its channels without it."
      ),
      Flag.atLeast(0)
    ),
    json: jsonFlag,
    options: Flag.String("options").pipe(
      Flag.withMetavar("<channel-id>=<json>"),
      Flag.withDescription(
        'What the post sets on a channel whose platform asks for more, as JSON tagged by its platform, such as 0190…=\'{"platform":"youtube","title":"Launch","madeForKids":false}\'; repeat it for several channels. A draft you change keeps the options it has on its other channels. peal channels tiktok shows what a TikTok channel takes, and peal channels capabilities every option of a channel.'
      ),
      Flag.atLeast(0)
    ),
    postId: Flag.String("post").pipe(
      Flag.withMetavar("<post-id>"),
      Flag.withDescription("The draft to change. Without it, a new draft."),
      Flag.optional
    ),
    tags: tagsFlag(
      "A tag to file the post under, by its id or its name, as peal tags list shows them; repeat it for several. A draft you change keeps its tags without it, and takes those given instead of them with it; peal posts tag takes them all off."
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
    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const params = { workspaceId: workspace.id };
    const given = yield* Effect.all(input.options.map(optionsOf));
    const tagIds = yield* tagIdsOf(session, input.tags);

    // Tags are sent only when some were given: a new draft has none
    // without them, and a draft that changes keeps its own.
    const filed = tagIds.length === 0 ? {} : { tagIds };

    const saved: Post = yield* Option.match(input.postId, {
      onNone: () =>
        checkDraft({
          channelIds: input.channels,
          content: {
            media: [],
            overrides: [],
            text: Option.getOrElse(input.text, () => ""),
          },
          options: given,
          ...filed,
        }).pipe(
          Effect.flatMap((payload) =>
            client.posts
              .create({ params, payload })
              .pipe(Effect.mapError(explain(url)))
          )
        ),
      // What the flags leave out stays as the draft has it: its media,
      // its text on some channels, and its options on the channels it
      // keeps.
      onSome: (postId) =>
        client.posts.get({ params: { ...params, postId } }).pipe(
          Effect.mapError(explain(url)),
          Effect.flatMap((draft) => {
            const channelIds =
              input.channels.length > 0
                ? input.channels
                : draft.targets.map(({ channelId }) => channelId);

            const kept = draft.targets.flatMap(({ channelId, options }) =>
              options === null ? [] : [{ channelId, options }]
            );

            return checkDraft({
              channelIds,
              content: {
                ...draft.content,
                text: Option.getOrElse(input.text, () => draft.content.text),
              },
              options: withOptions(channelIds, given, kept),
              ...filed,
            });
          }),
          Effect.flatMap((payload) =>
            client.posts
              .update({ params: { ...params, postId }, payload })
              .pipe(Effect.mapError(explain(url)))
          )
        ),
    });

    if (input.json) {
      yield* printJson(PostSchema, saved);

      return;
    }

    yield* Console.log(
      `Saved draft ${saved.id} in ${workspace.name}, for ${plural(saved.targets.length, "channel", "channels")}.`
    );
  })
).pipe(
  Command.withDescription(
    "Write a new draft, or change one: its text, channels, tags and the options of platforms that ask for more. peal posts schedule schedules it, and peal posts publish sends it now."
  )
);

const discard = Command.make(
  "discard",
  {
    json: jsonFlag,
    postId: Argument.String("post-id").pipe(
      Argument.withDescription("The draft, as peal drafts list shows its id.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("drafts.discard")(function* discard({
    json,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.posts
      .discard({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(`Discarded draft ${postId} of ${workspace.name}.`);
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
