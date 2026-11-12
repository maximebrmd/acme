import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  DraftPageSchema,
  maxDraftPageSize,
  PostDraftSchema,
  PostSchema,
} from "peal-contract";
import type { Post, PostDraft } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import {
  followUpsOf,
  optionsOf,
  thenDelayFlag,
  thenFlag,
  withOptions,
} from "#post-flags.ts";
import { columns, excerpt } from "#print.ts";
import { Refused } from "#refused.ts";
import {
  defaultSignaturesFlag,
  presetsOf,
  setsFlag,
  signatureFlag,
  warningLines,
} from "#saved-items.ts";
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
    defaultSignatures: defaultSignaturesFlag(
      "Put each channel's default signature under its text, as peal signatures list shows them: the workspace's under the post's text, a platform's or a channel's own under the text that channel has instead. A text that already ends with its signature is left as it is."
    ),
    json: jsonFlag,
    options: Flag.String("options").pipe(
      Flag.withMetavar("<channel-id>=<json>"),
      Flag.withDescription(
        'What the post sets on a channel whose platform asks for more, as JSON tagged by its platform, such as 0190…=\'{"platform":"youtube","title":"Launch","madeForKids":false}\'; repeat it for several channels. A draft you change keeps the options it has on its other channels; a new draft takes a channel\'s default options where it gives none (peal channels defaults). peal channels tiktok shows what a TikTok channel takes, and peal channels capabilities every option of a channel.'
      ),
      Flag.atLeast(0)
    ),
    parts: thenFlag(
      "A part that follows the post, text alone: a reply in a thread where the platform has threads. Repeat it for several, in order. A draft you change keeps its parts without it, and takes these instead with it."
    ),
    partsDelay: thenDelayFlag,
    postId: Flag.String("post").pipe(
      Flag.withMetavar("<post-id>"),
      Flag.withDescription("The draft to change. Without it, a new draft."),
      Flag.optional
    ),
    sets: setsFlag(
      "A channel set the post is for as well, by its id or its name, as peal sets list shows them; repeat it for several: its connected channels, with the options the set keeps for them where --options gives none. A channel of the set that is no longer connected is left out, and said."
    ),
    shortenLinks: Flag.Boolean("shorten-links").pipe(
      Flag.withDescription(
        "Send the post's links shortened, where the server has short links (peal short-links status): each link written with http:// or https:// and longer than a short address goes out as one, per channel, and counts its clicks; the text kept stays as written, and Pinterest, Instagram and TikTok keep links as written, as does a link to a channel's own platform. With --no-shorten-links, they go out as written. Without either, a new draft takes the workspace's default (peal short-links status) when it is made, and a draft you change keeps its own choice."
      ),
      Flag.optional
    ),
    signature: signatureFlag(
      "A signature to put under the post's text, on every channel, by its id or its name, as peal signatures list shows them; under the last part of a post with --then parts. It is then text of the post, counted against each platform's limit, and never added twice."
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
    const followUps = yield* followUpsOf(input.parts, input.partsDelay);
    const tagIds = yield* tagIdsOf(session, input.tags);

    // Tags are sent only when some were given: a new draft has none
    // without them, and a draft that changes keeps its own.
    const tagged = tagIds.length === 0 ? {} : { tagIds };

    // Sent only when a flag says: a new draft takes the workspace's
    // default without, and a draft that changes keeps its own.
    const filed = Option.match(input.shortenLinks, {
      onNone: () => tagged,
      onSome: (shortenLinks) => ({ ...tagged, shortenLinks }),
    });

    const presets = yield* presetsOf(session, input);

    const saved: Post = yield* Option.match(input.postId, {
      onNone: () =>
        checkDraft({
          channelIds: input.channels,
          content: {
            followUps,
            media: [],
            overrides: [],
            text: Option.getOrElse(input.text, () => ""),
          },
          options: given,
          ...filed,
          ...presets,
        }).pipe(
          Effect.flatMap((payload) =>
            client.posts
              .create({ params, payload })
              .pipe(Effect.mapError(explain(url)))
          )
        ),
      // What the flags leave out stays as the draft has it: its media,
      // its text on some channels, its parts, and its options on the
      // channels it keeps.
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
                followUps:
                  followUps.length > 0
                    ? followUps
                    : (draft.content.followUps ?? []),
                text: Option.getOrElse(input.text, () => draft.content.text),
              },
              options: withOptions(channelIds, given, kept),
              ...filed,
              ...presets,
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

    for (const line of warningLines(saved.warnings, true)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Write a new draft, or change one: its text, channels, tags and the options of platforms that ask for more. --set names a channel set instead of listing its channels, and --signature or --default-signatures puts a signature under its text. peal posts schedule schedules it, and peal posts publish sends it now."
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
