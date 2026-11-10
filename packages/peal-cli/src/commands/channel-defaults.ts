import { Console, Effect, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { ChannelDefaultsSchema, TargetOptionsSchema } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const channelArgument = Argument.String("channel-id").pipe(
  Argument.withDescription("The channel, as peal channels list shows its id.")
);

const decodeOptions = Schema.decodeUnknownEffect(
  Schema.fromJsonString(TargetOptionsSchema)
);

const show = Command.make(
  "show",
  { channelId: channelArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("channels.defaults.show")(function* show({
    channelId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const defaults = yield* client.channelDefaults
      .get({ params: { channelId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(ChannelDefaultsSchema, defaults);

      return;
    }

    yield* Console.log(
      defaults.options === null
        ? `Channel ${channelId} has no default options: a post takes there only the options it gives.`
        : `Default options of channel ${channelId}, which a new post takes there when it gives none: ${JSON.stringify(defaults.options)}`
    );
  })
).pipe(
  Command.withDescription(
    "Show the options a new post takes on a channel when it gives none there."
  )
);

const set = Command.make(
  "set",
  {
    channelId: channelArgument,
    json: jsonFlag,
    options: Flag.String("options").pipe(
      Flag.withMetavar("<json>"),
      Flag.withDescription(
        'The options of the channel\'s platform, as JSON tagged by it, as peal drafts save --options takes one channel\'s after its id: \'{"platform":"youtube","madeForKids":false,"privacy":"unlisted"}\'. They replace any the channel had, and may be unfinished, as a draft\'s. peal channels capabilities shows every option of a channel.'
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("channels.defaults.set")(function* setDefaults({
    channelId,
    json,
    options: given,
    workspace: choice,
  }) {
    const options = yield* decodeOptions(given).pipe(
      Effect.mapError(
        (failure) =>
          new Refused({
            reason: `--options takes a platform's options as JSON: ${failure.message}`,
          })
      )
    );

    const { client, url, workspace } = yield* inWorkspace(choice);

    const kept = yield* client.channelDefaults
      .set({
        params: { channelId, workspaceId: workspace.id },
        payload: { options },
      })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(ChannelDefaultsSchema, kept);

      return;
    }

    yield* Console.log(
      `Kept as the default options of channel ${channelId}: ${JSON.stringify(kept.options)}. A new draft or post takes them there when it gives none; posts already made keep theirs.`
    );
  })
).pipe(
  Command.withDescription(
    "Keep these as a channel's default options, instead of any it had: a new draft, and a post made in one command, takes them on the channel when it gives no options there and no channel set it names does. They are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself."
  )
);

const clear = Command.make(
  "clear",
  { channelId: channelArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("channels.defaults.clear")(function* clear({
    channelId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.channelDefaults
      .clear({ params: { channelId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
          `Channel ${channelId} has no default options any more. Posts already made keep theirs.`
        );
  })
).pipe(
  Command.withDescription(
    "Leave a channel without default options. Posts already made keep theirs."
  )
);

/** `peal channels defaults`: the options new posts take on a channel. */
export const defaults = Command.make("defaults").pipe(
  Command.withDescription(
    "A channel's default options: what a new post takes on the channel when it gives no options there, for the platforms that ask for more than text and media."
  ),
  Command.withSubcommands([show, set, clear])
);
