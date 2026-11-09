import type { ChannelStatus } from "acme-contract";
import { Console, Effect, Match } from "effect";
import { Command } from "effect/cli";

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

export const channels = Command.make("channels").pipe(
  Command.withDescription("The social accounts connected to a workspace."),
  Command.withSubcommands([list])
);
