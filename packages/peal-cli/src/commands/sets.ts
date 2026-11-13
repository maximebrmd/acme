import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ChannelSetDetailsSchema,
  ChannelSetSchema,
  maxChannelSetNameLength,
  maxChannelSetsPerWorkspace,
  maxChannelsPerSet,
} from "peal-contract";
import type { ChannelSet, ChannelSetDetails } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import {
  channelIdsOf,
  channelsFlag,
  optionsFlag,
  optionsOf,
  withOptions,
} from "#post-flags.ts";
import { Refused } from "#refused.ts";
import { findSet, setsOf } from "#saved-items.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

const setArgument = Argument.String("set").pipe(
  Argument.withDescription(
    "The channel set, by its id or its name, as peal sets list shows them. A name is read whatever its case."
  )
);

// A set that breaks the contract's own limits is refused before it is
// sent, rather than read as a broken request.
const checkSet = (details: {
  readonly channelIds: readonly string[];
  readonly name: string;
  readonly options: ChannelSetDetails["options"];
}) =>
  Schema.decodeUnknownEffect(ChannelSetDetailsSchema)(details).pipe(
    Effect.mapError(
      () =>
        new Refused({
          reason: `A channel set has a name of 1 to ${String(maxChannelSetNameLength)} characters, on one line, and 1 to ${String(maxChannelsPerSet)} channels, each once, with options for a channel once.`,
        })
    )
  );

// A set's channels, one per line under it: each as people recognize it,
// and whether it is still connected and has options of its own.
const channelLines = (
  set: ChannelSet,
  names: ReadonlyMap<string, string>
): string[] =>
  set.channelIds.map((channelId) => {
    if (set.unavailableChannelIds.includes(channelId)) {
      return `      ${channelId}: no longer connected, so posts leave it out`;
    }

    return set.options.some((chosen) => chosen.channelId === channelId)
      ? `      ${named(names, channelId)}, with options`
      : `      ${named(names, channelId)}`;
  });

// What a set holds, in a few words.
const holds = (set: ChannelSet): string => {
  const gone = set.unavailableChannelIds.length;
  const all = plural(set.channelIds.length, "channel", "channels");

  return gone === 0 ? all : `${all}, ${String(gone)} no longer connected`;
};

const list = Command.make(
  "list",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("sets.list")(function* list({ json, workspace: choice }) {
    const session = yield* inWorkspace(choice);
    const { client, workspace } = session;
    const sets = yield* setsOf(session);

    if (json) {
      yield* printJson(Schema.Array(ChannelSetSchema), sets);

      return;
    }

    if (sets.length === 0) {
      yield* Console.log(`${workspace.name} has no channel sets.`);

      return;
    }

    const names = yield* channelNames(client, workspace.id);

    yield* Console.log(`Channel sets of ${workspace.name}:`);

    for (const set of sets) {
      yield* Console.log(`  ${set.id}  ${set.name}  ${holds(set)}`);

      for (const line of channelLines(set, names)) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's channel sets, oldest first: each with its id, its name and its channels, saying which are no longer connected and which have options of their own."
  )
);

const create = Command.make(
  "create",
  {
    channels: channelsFlag(
      `A channel of the set, as peal channels list shows its id; repeat it, or separate ids with commas. At least one, ${String(maxChannelsPerSet)} at most.`
    ),
    json: jsonFlag,
    name: Argument.String("name").pipe(
      Argument.withDescription(
        `The set's name: ${String(maxChannelSetNameLength)} characters at most, on one line, which no other set of the workspace has, whatever its case. A CSV import names a set only by a name without spaces, commas or semicolons.`
      )
    ),
    options: optionsFlag(
      'What posts made with the set take on a channel whose platform asks for more, where they give none themselves, as peal drafts save takes it: JSON tagged by its platform, such as 0190…=\'{"platform":"youtube","madeForKids":false}\'; repeat it for several channels. Unfinished options are kept, and checked when a post that takes them is scheduled.'
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("sets.create")(function* create(input) {
    const payload = yield* checkSet({
      channelIds: channelIdsOf(input.channels),
      name: input.name.trim(),
      options: yield* Effect.all(input.options.map(optionsOf)),
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const made = yield* client.channelSets
      .create({ params: { workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ChannelSetSchema, made);

      return;
    }

    yield* Console.log(
      `Created channel set ${made.name} in ${workspace.name}, of ${holds(made)}: ${made.id}.`
    );
  })
).pipe(
  Command.withDescription(
    `Save a selection of the workspace's channels under a name, with the options posts take on some of them. peal post --set and peal drafts save --set then name the set instead of listing its channels. A workspace keeps ${String(maxChannelSetsPerWorkspace)} sets at most.`
  )
);

const update = Command.make(
  "update",
  {
    channels: channelsFlag(
      "A channel of the set from now on, as peal channels list shows its id; repeat it, or separate ids with commas: those given replace the set's. Without it the set keeps its channels that are still connected, and loses those that are not."
    ),
    json: jsonFlag,
    name: Flag.String("name").pipe(
      Flag.withMetavar("<name>"),
      Flag.withDescription(
        "Another name, which no other set of the workspace has. The set keeps its name without it."
      ),
      Flag.optional
    ),
    options: optionsFlag(
      "What posts made with the set take on a channel, as peal sets create takes it; repeat it for several channels. The set keeps the options it has on its other channels."
    ),
    set: setArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("sets.update")(function* update(input) {
    const givenChannels = channelIdsOf(input.channels);
    const givenOptions = yield* Effect.all(input.options.map(optionsOf));

    yield* Option.isNone(input.name) &&
    givenChannels.length === 0 &&
    givenOptions.length === 0
      ? Effect.fail(
          new Refused({
            reason:
              "Give --name, --channel, --options or several: nothing else of a channel set changes.",
          })
        )
      : Effect.void;

    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const set = yield* findSet(session, input.set);

    // What the flags leave out stays as the set has it, but the channels
    // disconnected since: a set is saved with connected channels only.
    const channelIds =
      givenChannels.length > 0
        ? givenChannels
        : set.channelIds.filter(
            (channelId) => !set.unavailableChannelIds.includes(channelId)
          );

    yield* channelIds.length === 0
      ? Effect.fail(
          new Refused({
            reason: `None of the channels of ${set.name} is connected any more: give its channels with --channel, or delete it with peal sets delete.`,
          })
        )
      : Effect.void;

    const payload = yield* checkSet({
      channelIds,
      name: Option.match(input.name, {
        onNone: () => set.name,
        onSome: (written) => written.trim(),
      }),
      options: withOptions(channelIds, givenOptions, set.options),
    });

    const changed = yield* client.channelSets
      .update({
        params: { channelSetId: set.id, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ChannelSetSchema, changed);

      return;
    }

    const left = set.channelIds.filter(
      (channelId) =>
        set.unavailableChannelIds.includes(channelId) &&
        !changed.channelIds.includes(channelId)
    );

    yield* Console.log(
      `Channel set ${changed.id} of ${workspace.name} is now ${changed.name}, of ${holds(changed)}. Posts made with it before keep their channels.`
    );

    if (left.length > 0) {
      yield* Console.log(
        `Taken out, as no longer connected: ${left.join(", ")}.`
      );
    }
  })
).pipe(
  Command.withDescription(
    "Change a channel set: its name, its channels, or the options posts take on them. What no flag names stays as it is, but the channels that are no longer connected, which a set cannot keep. Posts made with the set before keep their channels."
  )
);

const remove = Command.make(
  "delete",
  { json: jsonFlag, set: setArgument, workspace: workspaceFlag },
  Effect.fn("sets.delete")(function* remove({
    json,
    set: given,
    workspace: choice,
  }) {
    const session = yield* inWorkspace(choice);
    const { client, url, workspace } = session;
    const set = yield* findSet(session, given);

    yield* client.channelSets
      .delete({ params: { channelSetId: set.id, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
          `Deleted channel set ${set.name} of ${workspace.name}: its channels, and the posts made with it, stay.`
        );
  })
).pipe(
  Command.withDescription(
    "Delete a channel set for good. Its channels, and the posts made with it, stay."
  )
);

export const sets = Command.make("sets").pipe(
  Command.withDescription(
    "A workspace's channel sets: selections of its channels kept under a name, with the options posts take on some of them. peal post --set and peal drafts save --set name a set instead of listing its channels; a channel of a set that is no longer connected is left out, and said."
  ),
  Command.withSubcommands([list, create, update, remove])
);
