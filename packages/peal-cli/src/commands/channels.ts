import { Console, Effect, Match, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ChannelPageSchema,
  ChannelSchema,
  ChannelStatusNameSchema,
  defaultChannelPageSize,
  maxChannelPageSize,
  maxChannelQueryLength,
  PlatformSchema,
  TikTokAccountSchema,
} from "peal-contract";
import type {
  Channel,
  ChannelStatus,
  ChannelConnection,
  TikTokAccount,
} from "peal-contract";

import { capabilities, lookupWith } from "#commands/channel-capabilities.ts";
import { defaults } from "#commands/channel-defaults.ts";
import { settings } from "#commands/channel-settings.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const statusOf = (status: ChannelStatus): string =>
  Match.valueTags(status, {
    active: () => "posts",
    disabled: ({ refreshNeeded }) =>
      refreshNeeded ? "turned off, and must be reconnected" : "turned off",
    refreshNeeded: () => "must be reconnected",
  });

const connections: Readonly<Record<ChannelConnection, string>> = {
  facebookLogin: "through a Facebook Page",
  instagramLogin: "Instagram Login",
  linkedinPage: "company page",
  linkedinProfile: "profile",
};

// The platform, and for Instagram and LinkedIn the way in, which
// reconnecting takes.
const platformOf = (channel: Channel): string =>
  channel.connection === null
    ? channel.platform
    : `${channel.platform} (${connections[channel.connection]})`;

// A filter the command was given, as the query names it; nothing otherwise.
const given = <A, B extends object>(
  value: Option.Option<A>,
  named: (value: A) => B
) =>
  Option.match(value, {
    onNone: () => ({}),
    onSome: named,
  });

// The account as people recognize it: the name the workspace gave the
// channel first, if it gave one, and the platform's handle always.
const accountOf = (channel: Channel): string =>
  channel.label === null
    ? channel.handle
    : `${channel.label} (${channel.handle})`;

const linesOf = (channels: readonly Channel[]): string[] =>
  columns(
    channels.map((channel) => [
      `  ${channel.id}`,
      platformOf(channel),
      accountOf(channel),
      statusOf(channel.status),
      channel.tokenExpiresAt === null
        ? ""
        : `reconnect before ${instant(channel.tokenExpiresAt)}`,
    ])
  );

type StatusCounts = (typeof ChannelPageSchema.Type)["counts"];

// How many of the channels listed are in each status.
const countsOf = (channels: readonly Channel[]): StatusCounts => ({
  active: channels.filter(({ status }) => status._tag === "active").length,
  disabled: channels.filter(({ status }) => status._tag === "disabled").length,
  refreshNeeded: channels.filter(
    ({ status }) => status._tag === "refreshNeeded"
  ).length,
});

// The closing line: how many channels post, are off, or wait for someone.
const countsLine = (counts: StatusCounts): string =>
  `${String(counts.active)} post, ${String(counts.disabled)} turned off, ${String(counts.refreshNeeded)} to reconnect.`;

const list = Command.make(
  "list",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription(
        "Where the page before ended, as it printed: give it with the same filters."
      ),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many channels a page holds: ${String(defaultChannelPageSize)} unless given, at most ${String(maxChannelPageSize)}. Without --limit, --cursor or a filter, every channel is listed at once.`
      ),
      Flag.optional
    ),
    platform: Flag.Literals("platform", PlatformSchema.literals).pipe(
      Flag.withDescription("Only the channels of this platform."),
      Flag.optional
    ),
    search: Flag.String("search").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        `Only the channels whose handle, the name their platform shows or the name the workspace gave them holds this text, whatever its case: ${String(maxChannelQueryLength)} characters at most.`
      ),
      Flag.optional
    ),
    status: Flag.Literals("status", ChannelStatusNameSchema.literals).pipe(
      Flag.withDescription(
        "Only the channels that are so: active (they post), disabled (turned off) or refreshNeeded (to reconnect)."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("channels.list")(function* list(input) {
    const text = input.search.pipe(Option.map((written) => written.trim()));

    // Text the search would not take is refused before a request leaves.
    yield* Option.exists(
      text,
      ({ length }) => length === 0 || length > maxChannelQueryLength
    )
      ? Effect.fail(
          new Refused({
            reason: `--search takes 1 to ${String(maxChannelQueryLength)} characters.`,
          })
        )
      : Effect.void;

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const query = {
      ...given(input.cursor, (cursor) => ({ cursor })),
      ...given(input.limit, (size) => ({
        limit: Math.min(Math.max(size, 1), maxChannelPageSize),
      })),
      ...given(input.platform, (platform) => ({ platform })),
      ...given(text, (q) => ({ q })),
      ...given(input.status, (status) => ({ status })),
    };

    // Without a filter or a page, every channel at once, as before the
    // search was: scripts that read its JSON keep the array they know.
    if (Object.keys(query).length === 0) {
      const channels = yield* client.channels
        .list({ params: { workspaceId: workspace.id } })
        .pipe(Effect.mapError(explain(url)));

      if (input.json) {
        yield* printJson(Schema.Array(ChannelSchema), channels);

        return;
      }

      if (channels.length === 0) {
        yield* Console.log(
          `${workspace.name} has no channels yet: connect accounts in the web app.`
        );

        return;
      }

      yield* Console.log(`Channels of ${workspace.name}:`);

      for (const line of linesOf(channels)) {
        yield* Console.log(line);
      }

      yield* Console.log(`In all: ${countsLine(countsOf(channels))}`);

      return;
    }

    const page = yield* client.channels
      .find({ params: { workspaceId: workspace.id }, query })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ChannelPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(`No channel of ${workspace.name} matches.`);
    } else {
      yield* Console.log(`Channels of ${workspace.name}:`);

      for (const line of linesOf(page.items)) {
        yield* Console.log(line);
      }
    }

    // Whatever the status asked for, so the other statuses show too.
    yield* Console.log(
      Option.isSome(input.platform) || Option.isSome(text)
        ? `Of those the platform and the text match, whatever their status: ${countsLine(page.counts)}`
        : `In all: ${countsLine(page.counts)}`
    );

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: the same command with --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's channels, oldest first, with the ids posts take, the name the workspace gave each beside its handle, and whether each one posts, is turned off or must be reconnected; a closing line counts them by status. With --platform, --status, --search, --limit or --cursor, a page at a time, every filter holding; --json then prints the page (items, nextCursor, counts) rather than the list."
  )
);

const blocks: Readonly<
  Record<
    Extract<TikTokAccount["posting"], { _tag: "blocked" }>["reason"],
    string
  >
> = {
  banned: "TikTok bars this account from posting.",
  clientLimit:
    "This server's TikTok app reached its count of creators for the day: try again tomorrow.",
  postLimit:
    "The account posted as much as TikTok allows today: try again tomorrow.",
};

// What a TikTok channel takes, as TikTok asks a client to show it first.
const creatorLines = (account: TikTokAccount): readonly string[] => {
  const photos = account.takesPhotos
    ? "This server posts videos and photos to TikTok."
    : "This server posts videos only to TikTok: photos need an address TikTok verified.";

  if (account.posting._tag === "blocked") {
    return [blocks[account.posting.reason], photos];
  }

  const { creator } = account.posting;

  const off = [
    creator.commentDisabled ? "comments" : [],
    creator.duetDisabled ? "Duet" : [],
    creator.stitchDisabled ? "Stitch" : [],
  ].flat();

  return [
    creator.username === ""
      ? `Posting as ${creator.nickname}.`
      : `Posting as ${creator.nickname} (@${creator.username}).`,
    `Who can view a post (its privacyLevel, no default): ${creator.privacyLevels.join(", ")}.`,
    off.length === 0
      ? "The account allows comments, Duet and Stitch: each stays off until a post turns it on."
      : `Turned off in the account's settings, so off on every post: ${off.join(", ")}.`,
    creator.maxVideoDurationMs === null
      ? "TikTok does not say how long its videos may be."
      : `Videos up to ${String(Math.floor(creator.maxVideoDurationMs / 1000))} seconds.`,
    photos,
    "Posting means agreeing to TikTok's Music Usage Confirmation, and to its Branded Content Policy for branded content.",
  ];
};

const tiktok = Command.make(
  "tiktok",
  {
    channelId: Argument.String("channel-id").pipe(
      Argument.withDescription(
        "The TikTok channel, as peal channels list shows its id."
      )
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("channels.tiktok")(function* tiktokCreator({
    channelId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const account = yield* client.tiktok
      .creator({ params: { channelId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(TikTokAccountSchema, account);

      return;
    }

    for (const line of creatorLines(account)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show what a TikTok channel takes, fresh from TikTok: who it posts as, the audiences a post may choose, the interactions the account turned off and its longest video."
  )
);

export const channels = Command.make("channels").pipe(
  Command.withDescription("The social accounts connected to a workspace."),
  Command.withSubcommands([
    list,
    ...settings,
    capabilities,
    lookupWith(creatorLines),
    tiktok,
    defaults,
  ])
);
