import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ChannelSchema,
  ChannelUpdateSchema,
  maxChannelLabelLength,
} from "peal-contract";
import type { Channel } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { channelName } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

// What a workspace decides about a channel it keeps: the name it calls it
// by, and whether it is on.

const channelArgument = Argument.String("channel-id").pipe(
  Argument.withDescription("The channel, as peal channels list shows its id.")
);

// The account behind a channel, whatever the workspace calls it.
const accountOf = (channel: Channel): string =>
  `${channel.platform} ${channel.handle}`;

// A name that breaks the contract's own limits is refused before it is
// sent, rather than read as a broken request.
const checkLabel = (label: string | null) =>
  Schema.decodeUnknownEffect(ChannelUpdateSchema)({ label }).pipe(
    Effect.mapError(
      () =>
        new Refused({
          reason: `A channel's name has 1 to ${String(maxChannelLabelLength)} characters, on one line.`,
        })
    )
  );

const rename = Command.make(
  "rename",
  {
    channelId: channelArgument,
    clear: Flag.Boolean("clear").pipe(
      Flag.withDescription(
        "Take back the name the workspace gave the channel, as giving no name does."
      ),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    name: Argument.String("name").pipe(
      Argument.withDescription(
        `The name the workspace calls the channel by: ${String(maxChannelLabelLength)} characters at most, on one line. Without one, the channel loses the name it was given.`
      ),
      Argument.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("channels.rename")(function* rename({
    channelId,
    clear,
    json,
    name,
    workspace: choice,
  }) {
    if (clear && Option.isSome(name)) {
      yield* new Refused({
        reason:
          "Give a name, or --clear to take the channel's name back: not both.",
      });
    }

    const payload = yield* checkLabel(
      name.pipe(
        Option.map((written) => written.trim()),
        Option.getOrNull
      )
    );

    const { client, url, workspace } = yield* inWorkspace(choice);

    const channel = yield* client.channels
      .update({ params: { channelId, workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(ChannelSchema, channel);

      return;
    }

    yield* Console.log(
      channel.label === null
        ? `Channel ${channel.id} of ${workspace.name} has no name of the workspace's any more: it is shown as ${accountOf(channel)}.`
        : `Channel ${channel.id} of ${workspace.name} is now called ${channel.label}, beside ${accountOf(channel)}. The name is Peal's own: nothing changes on the platform.`
    );
  })
).pipe(
  Command.withDescription(
    "Give a channel the name the workspace calls it by, shown in Peal beside the handle its platform gives the account, and sent to no platform. Without a name, or with --clear, take that name back."
  )
);

const disable = Command.make(
  "disable",
  { channelId: channelArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("channels.disable")(function* disable({
    channelId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const channel = yield* client.channels
      .disable({ params: { channelId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(ChannelSchema, channel);

      return;
    }

    yield* Console.log(
      `Channel ${channel.id} (${channelName(channel)}) of ${workspace.name} is turned off: nothing goes out on it. A post that reaches its time meanwhile fails on this channel, goes out on its others, and is not sent later. The channel keeps its connection, its history and its place in the plan; peal channels enable ${channel.id} turns it back on.`
    );
  })
).pipe(
  Command.withDescription(
    "Turn a channel off: nothing goes out on it until it is turned back on, and a post that reaches its time meanwhile fails on it. It keeps its connection, its history and its name, and nothing is deleted. A channel already off stays as it is."
  )
);

const enable = Command.make(
  "enable",
  { channelId: channelArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("channels.enable")(function* enable({
    channelId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const channel = yield* client.channels
      .enable({ params: { channelId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(ChannelSchema, channel);

      return;
    }

    const named = `Channel ${channel.id} (${channelName(channel)}) of ${workspace.name}`;

    yield* Console.log(
      channel.status._tag === "refreshNeeded"
        ? `${named} is turned back on, and must be reconnected before it posts: its platform stopped accepting its access meanwhile. Reconnect the account in the web app. Posts that failed while it was off are not sent: schedule them anew.`
        : `${named} is turned back on: posts go out on it again. Posts that failed while it was off are not sent: schedule them anew.`
    );
  })
).pipe(
  Command.withDescription(
    "Turn a channel back on: it posts again at once, or must be reconnected when its platform stopped accepting its access while it was off. A channel that is on stays as it is."
  )
);

/** peal channels rename, disable and enable. */
export const settings = [rename, disable, enable] as const;
