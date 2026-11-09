import type { ChannelStatus, TikTokAccount } from "peal-contract";
import { Console, Effect, Match } from "effect";
import { Argument, Command } from "effect/cli";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const statusOf = (status: ChannelStatus): string =>
  Match.valueTags(status, {
    active: () => "posts",
    disabled: ({ refreshNeeded }) =>
      refreshNeeded ? "turned off, and must be reconnected" : "turned off",
    refreshNeeded: () => "must be reconnected",
  });

const list = Command.make(
  "list",
  { workspace: workspaceFlag },
  Effect.fn("channels.list")(function* list({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const channels = yield* client.channels
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (channels.length === 0) {
      yield* Console.log(
        `${workspace.name} has no channels yet: connect accounts in the web app.`
      );

      return;
    }

    yield* Console.log(`Channels of ${workspace.name}:`);

    for (const line of columns(
      channels.map((channel) => [
        `  ${channel.id}`,
        channel.platform,
        channel.handle,
        statusOf(channel.status),
        channel.tokenExpiresAt === null
          ? ""
          : `reconnect before ${instant(channel.tokenExpiresAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's channels, with the ids posts take, and whether each one posts or must be reconnected."
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
    workspace: workspaceFlag,
  },
  Effect.fn("channels.tiktok")(function* tiktokCreator({
    channelId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const account = yield* client.tiktok
      .creator({ params: { channelId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

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
  Command.withSubcommands([list, tiktok])
);
