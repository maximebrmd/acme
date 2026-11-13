import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  CreatedFeedSchema,
  FeedItemsSchema,
  FeedModeSchema,
  FeedPageSchema,
  FeedPreviewSchema,
  FeedSchema,
  maxFeedPageSize,
  maxFeedTemplateLength,
  maxFeedsPerWorkspace,
} from "peal-contract";
import type { Feed, FeedChange } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { channelIdsOf, channelsFlag } from "#post-flags.ts";
import { excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { findQueue, findSet } from "#saved-items.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

type InWorkspace = Effect.Success<ReturnType<typeof inWorkspace>>;

const feedArgument = Argument.String("feed").pipe(
  Argument.withDescription("The feed, by its id, as peal feeds list shows it.")
);

const urlArgument = Argument.String("url").pipe(
  Argument.withDescription(
    "The feed's address: RSS 2.0, Atom 1.0 or JSON Feed 1.1, public HTTPS only."
  )
);

const templateFlag = Flag.String("template").pipe(
  Flag.withMetavar("<text>"),
  Flag.withDescription(
    `What each post says: {title}, {link} and {summary} are replaced by the item's; ${String(maxFeedTemplateLength)} characters at most. Left out when adding, the title, a blank line and the link.`
  ),
  Flag.optional
);

const modeFlag = Flag.Literals("mode", FeedModeSchema.literals).pipe(
  Flag.withDescription(
    "draft (the default): each item becomes a draft for a person to finish; queue: each goes on the queue's next free slot, in public, without anyone reading it first."
  ),
  Flag.optional
);

const queueFlag = Flag.String("queue").pipe(
  Flag.withMetavar("<id-or-name>"),
  Flag.withDescription(
    "With --mode queue, the queue, by its id or its name; left out, the workspace's default queue."
  ),
  Flag.optional
);

const setFlag = Flag.String("set").pipe(
  Flag.withMetavar("<id-or-name>"),
  Flag.withDescription(
    "A channel set the posts go to as well, by its id or its name."
  ),
  Flag.optional
);

const pictureFlag = Flag.Boolean("picture").pipe(
  Flag.withDescription(
    "Attach each item's picture to its post, when it has one."
  ),
  Flag.optional
);

// A template as typed: a shell passes `\n` inside double quotes as two
// characters, which a post would then show; such a template is refused
// with the way to write a line break.
const templateOf = (given: Option.Option<string>) =>
  Option.match(given, {
    onNone: () => Effect.succeed(Option.none<string>()),
    onSome: (template) =>
      template.includes("\\n")
        ? Effect.fail(
            new Refused({
              reason: `--template holds \\n, which a post would show as written: write a line break with $'…', such as --template $'${template.replaceAll("\n", "\\n")}'.`,
            })
          )
        : Effect.succeed(Option.some(template)),
  });

// Where a feed is, in a few words.
const summary = (feed: Feed): string =>
  [
    feed.mode === "queue" ? "to a queue" : "to drafts",
    feed.status === "stopped"
      ? `stopped: ${feed.stopReason ?? "unknown"}`
      : feed.status,
    feed.lastFailure === null ? undefined : `failing: ${feed.lastFailure}`,
  ]
    .filter((part) => part !== undefined)
    .join(", ");

const printFeed = (feed: Feed, json: boolean, said: string) =>
  json
    ? printJson(FeedSchema, feed)
    : Effect.gen(function* printed() {
        yield* Console.log(`${said} (${summary(feed)}): ${feed.id}.`);
        yield* Console.log(`  ${feed.url}`);

        if (feed.title !== null) {
          yield* Console.log(`  title: ${excerpt(feed.title)}`);
        }

        yield* Console.log(`  next read: ${instant(feed.nextCheckAt)}`);
      });

// The ids of the set and the queue a command names, resolved.
const savedIdsOf = (
  session: InWorkspace,
  given: {
    readonly queue: Option.Option<string>;
    readonly set: Option.Option<string>;
  }
) =>
  Effect.all({
    queueId: Option.match(given.queue, {
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (name) =>
        findQueue(session, name).pipe(Effect.map(({ id }) => Option.some(id))),
    }),
    setId: Option.match(given.set, {
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (name) =>
        findSet(session, name).pipe(Effect.map(({ id }) => Option.some(id))),
    }),
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
        `How many feeds a page holds, ${String(maxFeedPageSize)} at most.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("feeds.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.feeds
      .list({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(input.cursor, {
            onNone: () => ({}),
            onSome: (cursor) => ({ cursor }),
          }),
          ...Option.match(input.limit, {
            onNone: () => ({}),
            onSome: (limit) => ({ limit }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(FeedPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `${workspace.name} follows no feed: peal feeds add follows one.`
      );

      return;
    }

    yield* Console.log(`Feeds of ${workspace.name}:`);

    for (const feed of page.items) {
      yield* Console.log(`  ${feed.id}  ${feed.url}  ${summary(feed)}`);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal feeds list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the web feeds the workspace follows: their address, where their posts go and where each is."
  )
);

const show = Command.make(
  "show",
  { feed: feedArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("feeds.show")(function* show(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const feed = yield* client.feeds
      .get({ params: { feedId: input.feed, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* printFeed(feed, input.json, "Feed");

    if (!input.json) {
      yield* Console.log(`  template: ${excerpt(feed.template)}`);
    }
  })
).pipe(
  Command.withDescription(
    "Show a feed: its address, template, where its posts go, when it was last read and is next, and why its reads fail, if they do."
  )
);

const add = Command.make(
  "add",
  {
    channels: channelsFlag(
      "A channel its posts go to, as peal channels list shows its id; repeat it, or separate ids with commas."
    ),
    json: jsonFlag,
    mode: modeFlag,
    picture: pictureFlag,
    queue: queueFlag,
    set: setFlag,
    template: templateFlag,
    url: urlArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("feeds.add")(function* add(input) {
    yield* Option.isSome(input.queue) && !Option.contains(input.mode, "queue")
      ? Effect.fail(new Refused({ reason: "--queue goes with --mode queue." }))
      : Effect.void;

    const template = yield* templateOf(input.template);
    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const { queueId, setId } = yield* savedIdsOf(session, input);

    const created = yield* client.feeds
      .create({
        params: { workspaceId: workspace.id },
        payload: {
          channelIds: channelIdsOf(input.channels),
          url: input.url,
          ...Option.match(input.mode, {
            onNone: () => ({}),
            onSome: (mode) => ({ mode }),
          }),
          ...Option.match(input.picture, {
            onNone: () => ({}),
            onSome: (attachPicture) => ({ attachPicture }),
          }),
          ...Option.match(queueId, {
            onNone: () => ({}),
            onSome: (id) => ({ queueId: id }),
          }),
          ...Option.match(setId, {
            onNone: () => ({}),
            onSome: (id) => ({ channelSetId: id }),
          }),
          ...Option.match(template, {
            onNone: () => ({}),
            onSome: (written) => ({ template: written }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(CreatedFeedSchema, created);

      return;
    }

    yield* printFeed(
      created.feed,
      false,
      `Following ${created.feed.url}, ${String(created.seen)} items it holds left as they are`
    );
  })
).pipe(
  Command.withDescription(
    `Follow a web feed: each item that appears in it from now on becomes a draft, or with --mode queue a post on the queue's next free slot, written from --template. What it holds now is never posted. ${String(maxFeedsPerWorkspace)} feeds a workspace at most. What a feed says is other people's text.`
  )
);

const update = Command.make(
  "update",
  {
    channels: channelsFlag(
      "The channels its posts go to, replacing those it had; repeat it, or separate ids with commas."
    ),
    defaultQueue: Flag.Boolean("default-queue").pipe(
      Flag.withDescription(
        "Put its posts on the workspace's default queue, whichever it is then, rather than a queue named."
      ),
      Flag.withDefault(false)
    ),
    feed: feedArgument,
    json: jsonFlag,
    mode: modeFlag,
    noSet: Flag.Boolean("no-set").pipe(
      Flag.withDescription("Take the channel set away."),
      Flag.withDefault(false)
    ),
    picture: pictureFlag,
    queue: queueFlag,
    set: setFlag,
    template: templateFlag,
    url: Flag.String("url").pipe(
      Flag.withDescription(
        "A new address, read at once: what it holds then is never posted."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("feeds.update")(function* update(input) {
    const template = yield* templateOf(input.template);
    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const { queueId, setId } = yield* savedIdsOf(session, input);

    yield* Option.isSome(input.queue) && input.defaultQueue
      ? Effect.fail(
          new Refused({
            reason: "Give --queue or --default-queue, not both.",
          })
        )
      : Effect.void;

    // A queue goes with a feed that puts posts on one.
    if (
      (Option.isSome(input.queue) || input.defaultQueue) &&
      !Option.contains(input.mode, "queue")
    ) {
      const current = yield* client.feeds
        .get({ params: { feedId: input.feed, workspaceId: workspace.id } })
        .pipe(Effect.mapError(explain(url)));

      yield* current.mode !== "queue" || Option.contains(input.mode, "draft")
        ? Effect.fail(
            new Refused({
              reason:
                "--queue and --default-queue go with a feed whose posts go on a queue: add --mode queue.",
            })
          )
        : Effect.void;
    }

    const payload: { -readonly [K in keyof FeedChange]: FeedChange[K] } = {};
    const channels = channelIdsOf(input.channels);

    if (channels.length > 0) {
      payload.channelIds = channels;
    }

    if (Option.isSome(input.mode)) {
      payload.mode = input.mode.value;
    }

    if (Option.isSome(input.picture)) {
      payload.attachPicture = input.picture.value;
    }

    if (Option.isSome(queueId)) {
      payload.queueId = queueId.value;
    }

    if (input.defaultQueue) {
      payload.queueId = null;
    }

    if (Option.isSome(setId) || input.noSet) {
      payload.channelSetId = Option.getOrNull(setId);
    }

    if (Option.isSome(template)) {
      payload.template = template.value;
    }

    if (Option.isSome(input.url)) {
      payload.url = input.url.value;
    }

    yield* Object.keys(payload).length === 0
      ? Effect.fail(
          new Refused({
            reason:
              "Give --channel, --mode, --queue, --default-queue, --set, --no-set, --template, --url, --picture or several: nothing else of a feed changes (peal feeds pause and resume change its state).",
          })
        )
      : Effect.void;

    const feed = yield* client.feeds
      .update({
        params: { feedId: input.feed, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    yield* printFeed(feed, input.json, `Feed ${feed.id} changed`);
  })
).pipe(
  Command.withDescription(
    "Change what a feed names: its channels, mode, queue, channel set, template or address. Posts it made keep what they say."
  )
);

const statusCommand = (
  name: "pause" | "resume",
  status: "active" | "paused",
  description: string
) =>
  Command.make(
    name,
    { feed: feedArgument, json: jsonFlag, workspace: workspaceFlag },
    Effect.fn(`feeds.${name}`)(function* changed(input) {
      const { client, url, workspace } = yield* inWorkspace(input.workspace);

      const feed = yield* client.feeds
        .update({
          params: { feedId: input.feed, workspaceId: workspace.id },
          payload: { status },
        })
        .pipe(Effect.mapError(explain(url)));

      // A stopped feed is not paused: it stays as it stopped.
      if (!input.json && feed.status === "stopped") {
        yield* Console.log(
          `Feed ${feed.id} is stopped (${feed.stopReason ?? "unknown"}): peal feeds resume sets it going again.`
        );

        return;
      }

      yield* printFeed(
        feed,
        input.json,
        status === "paused"
          ? `Paused feed ${feed.id}`
          : `Resumed feed ${feed.id}`
      );
    })
  ).pipe(Command.withDescription(description));

const pause = statusCommand(
  "pause",
  "paused",
  "Pause a feed: it is not read until resumed."
);

const resume = statusCommand(
  "resume",
  "active",
  "Set a paused or stopped feed going again: it is read at once, and what it holds then is never posted."
);

const remove = Command.make(
  "remove",
  { feed: feedArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("feeds.remove")(function* remove(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    yield* client.feeds
      .delete({ params: { feedId: input.feed, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(
          `Stopped following feed ${input.feed}: the drafts and posts it made stay as they are.`
        );
  })
).pipe(
  Command.withDescription(
    "Stop following a feed: the drafts and posts it made stay as they are."
  )
);

const preview = Command.make(
  "preview",
  {
    json: jsonFlag,
    template: templateFlag,
    url: urlArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("feeds.preview")(function* preview(input) {
    const template = yield* templateOf(input.template);
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const read = yield* client.feeds
      .preview({
        params: { workspaceId: workspace.id },
        payload: {
          url: input.url,
          ...Option.match(template, {
            onNone: () => ({}),
            onSome: (written) => ({ template: written }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(FeedPreviewSchema, read);

      return;
    }

    yield* Console.log(
      `${read.title === null ? input.url : excerpt(read.title)}, its newest items as posts:`
    );

    for (const item of read.items) {
      yield* Console.log(
        `  ${item.text === null ? "(nothing to post)" : excerpt(item.text)}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "Read a feed's address and show its three newest items as the template would write them. Makes and keeps nothing."
  )
);

const items = Command.make(
  "items",
  { feed: feedArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("feeds.items")(function* items(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const read = yield* client.feeds
      .items({ params: { feedId: input.feed, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(FeedItemsSchema, read);

      return;
    }

    if (read.items.length === 0) {
      yield* Console.log(`Feed ${input.feed} read nothing yet.`);

      return;
    }

    for (const item of read.items) {
      yield* Console.log(
        [
          `  ${instant(item.seenAt)}`,
          item.reason === null
            ? item.outcome
            : `${item.outcome} (${item.reason})`,
          item.postId === null ? undefined : `post ${item.postId}`,
          item.pictureSkipped === null
            ? undefined
            : `without its picture (${item.pictureSkipped})`,
        ]
          .filter((part) => part !== undefined)
          .join("  ")
      );
    }
  })
).pipe(
  Command.withDescription(
    "List a feed's 50 newest items: when each was seen, what became of it and the post made, never what it said."
  )
);

export const feeds = Command.make("feeds").pipe(
  Command.withDescription(
    "Web feeds (RSS, Atom, JSON Feed) the workspace follows: each new item becomes a draft, or a post on a queue, written from a template."
  ),
  Command.withSubcommands([
    list,
    show,
    add,
    update,
    pause,
    resume,
    remove,
    preview,
    items,
  ])
);
