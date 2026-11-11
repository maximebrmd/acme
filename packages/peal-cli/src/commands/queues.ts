import { Array as Arr, Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  defaultQueuePreview,
  maxChannelsPerQueue,
  maxQueueNameLength,
  maxQueuePreview,
  maxQueuesPerWorkspace,
  maxSlotsPerQueue,
  QueueDetailsSchema,
  QueuePreviewSchema,
  QueueReshuffleSchema,
  QueueSchema,
  queueHorizonDays,
  weekdays,
} from "peal-contract";
import type {
  Queue,
  QueueDetails,
  QueuePreview,
  QueueReshuffle,
  QueueSlot,
  ReshuffleStop,
  Weekday,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { channelIdsOf, channelsFlag } from "#post-flags.ts";
import { instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { findQueue, findSet, queuesOf } from "#saved-items.ts";
import { zoneFlag } from "#when.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

const queueArgument = Argument.String("queue").pipe(
  Argument.withDescription(
    "The queue, by its id or its name, as peal queues list shows them. A name is read whatever its case."
  )
);

const slotFlag = (description: string) =>
  Flag.String("slot").pipe(
    Flag.withMetavar("<day>@<HH:mm>"),
    Flag.withDescription(description),
    Flag.atLeast(0)
  );

const queueZoneFlag = zoneFlag(
  "The IANA time zone the queue's slots are read in, such as Europe/Paris: a slot keeps its time of day there whatever daylight saving does."
);

const channelSetFlag = Flag.String("set").pipe(
  Flag.withMetavar("<id-or-name>"),
  Flag.withDescription(
    "A channel set a post added to the queue goes to when it names no channel, by its id or its name, as peal sets list shows them."
  ),
  Flag.optional
);

const slotPattern =
  /^(?<day>[a-z]+)@(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d)$/u;

// A day as people write it: its full English name or its first three
// letters, whatever its case.
const dayOf = (written: string): Option.Option<Weekday> =>
  Option.fromUndefinedOr(
    weekdays.find(
      (day) =>
        day === written || (written.length === 3 && day.startsWith(written))
    )
  );

/** `--slot mon@09:00`: a day of the week and a time of day. */
export const slotOf = (given: string): Effect.Effect<QueueSlot, Refused> => {
  const match = slotPattern.exec(given.trim().toLowerCase());
  const groups = match?.groups;

  const day = Option.fromUndefinedOr(groups?.["day"]).pipe(
    Option.flatMap(dayOf)
  );

  return Option.isNone(day) || groups === undefined
    ? Effect.fail(
        new Refused({
          reason: `--slot takes a day and a time of day on a 24-hour clock, such as mon@09:00 or friday@17:30: not ${given}.`,
        })
      )
    : Effect.succeed({
        day: day.value,
        time: `${groups["hour"] ?? "00"}:${groups["minute"] ?? "00"}`,
      });
};

// The slots, each once, in the order given.
const slotsOf = (given: readonly string[]) =>
  Effect.all(given.map(slotOf)).pipe(
    Effect.map(
      Arr.dedupeWith(
        (left: QueueSlot, right: QueueSlot) =>
          left.day === right.day && left.time === right.time
      )
    )
  );

// A queue that breaks the contract's own limits is refused before it is
// sent, rather than read as a broken request.
const checkQueue = (details: QueueDetails) =>
  Schema.decodeUnknownEffect(QueueDetailsSchema)(details).pipe(
    Effect.mapError(
      () =>
        new Refused({
          reason: `A queue has a name of 1 to ${String(maxQueueNameLength)} characters, on one line, ${String(maxSlotsPerQueue)} slots at most and ${String(maxChannelsPerQueue)} channels at most, each once.`,
        })
    )
  );

const dayAbbreviation = (day: Weekday) => day.slice(0, 3);

/** A queue's week, as `--slot` takes it. */
export const weekOf = (queue: Queue): string =>
  queue.slots.length === 0
    ? "no slot"
    : queue.slots
        .map(({ day, time }) => `${dayAbbreviation(day)}@${time}`)
        .join(" ");

// What a queue is, in a few words.
const summary = (queue: Queue): string =>
  [
    queue.isDefault ? "default" : undefined,
    queue.timeZone,
    plural(queue.slots.length, "slot", "slots"),
    plural(queue.channelIds.length, "channel", "channels"),
  ]
    .filter((part) => part !== undefined)
    .join(", ");

// The channels a queue is for, one per line, saying which are gone.
const channelLines = (queue: Queue, names: ReadonlyMap<string, string>) =>
  queue.channelIds.map((channelId) =>
    queue.unavailableChannelIds.includes(channelId)
      ? `      ${channelId}: no longer connected, so posts leave it out`
      : `      ${named(names, channelId)}`
  );

/** The line saying where a post added now goes, or why it cannot. */
export const nextFreeLine = (preview: QueuePreview): string => {
  if (preview.nextFree !== null) {
    return `Next free slot: ${instant(preview.nextFree)}.`;
  }

  return preview.noRoom === "noSlots"
    ? "No free slot: the queue has no slot. Add some with peal queues update --slot."
    : `No free slot: every slot of the next ${String(queueHorizonDays)} days is taken.`;
};

const previewLines = (preview: QueuePreview) => [
  ...preview.slots.map(
    ({ at, postId }) =>
      `  ${instant(at)}  ${postId === null ? "free" : `taken by ${postId}`}`
  ),
  nextFreeLine(preview),
];

const previewOf = (
  session: Effect.Success<ReturnType<typeof inWorkspace>>,
  queue: Queue,
  count: number
) =>
  session.client.queues
    .slots({
      params: { queueId: queue.id, workspaceId: session.workspace.id },
      query: { count },
    })
    .pipe(Effect.mapError(explain(session.url)));

const list = Command.make(
  "list",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("queues.list")(function* list({ json, workspace: choice }) {
    const session = yield* inWorkspace(choice);
    const { client, workspace } = session;
    const queues = yield* queuesOf(session);

    if (json) {
      yield* printJson(Schema.Array(QueueSchema), queues);

      return;
    }

    if (queues.length === 0) {
      yield* Console.log(
        `${workspace.name} has no queue: peal queues create makes one.`
      );

      return;
    }

    const names = yield* channelNames(client, workspace.id);

    yield* Console.log(`Queues of ${workspace.name}:`);

    for (const queue of queues) {
      yield* Console.log(`  ${queue.id}  ${queue.name}  ${summary(queue)}`);
      yield* Console.log(`      ${weekOf(queue)}`);

      for (const line of channelLines(queue, names)) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's queues, the default first: each with its id, its name, its zone, its weekly slots and its channels, saying which are no longer connected."
  )
);

const show = Command.make(
  "show",
  { json: jsonFlag, queue: queueArgument, workspace: workspaceFlag },
  Effect.fn("queues.show")(function* show({
    json,
    queue: given,
    workspace: choice,
  }) {
    const session = yield* inWorkspace(choice);
    const queue = yield* findQueue(session, given);

    if (json) {
      yield* printJson(QueueSchema, queue);

      return;
    }

    const names = yield* channelNames(session.client, session.workspace.id);
    const preview = yield* previewOf(session, queue, 5);

    yield* Console.log(`${queue.name} (${queue.id}): ${summary(queue)}.`);
    yield* Console.log(`  Slots: ${weekOf(queue)}`);

    if (Option.isSome(Option.fromNullOr(queue.channelSetId))) {
      yield* Console.log(`  Channel set: ${queue.channelSetId ?? ""}`);
    }

    if (queue.channelIds.length > 0) {
      yield* Console.log("  Channels:");

      for (const line of channelLines(queue, names)) {
        yield* Console.log(line);
      }
    }

    yield* Console.log(`  ${nextFreeLine(preview)}`);
  })
).pipe(
  Command.withDescription(
    "Show a queue: its zone, its weekly slots, its channels, and the slot a post added now would take. --json prints the queue as the API answers it."
  )
);

const preview = Command.make(
  "preview",
  {
    count: Flag.Int("count").pipe(
      Flag.withMetavar("<n>"),
      Flag.withDescription(
        `How many coming slots to list, 1 to ${String(maxQueuePreview)}; ${String(defaultQueuePreview)} unless given.`
      ),
      Flag.withDefault(defaultQueuePreview)
    ),
    json: jsonFlag,
    queue: queueArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("queues.preview")(function* previewCommand(input) {
    if (input.count < 1 || input.count > maxQueuePreview) {
      yield* new Refused({
        reason: `--count takes 1 to ${String(maxQueuePreview)}, not ${String(input.count)}.`,
      });
    }

    const session = yield* inWorkspace(input.workspace);
    const queue = yield* findQueue(session, input.queue);
    const coming = yield* previewOf(session, queue, input.count);

    if (input.json) {
      yield* printJson(QueuePreviewSchema, coming);

      return;
    }

    yield* Console.log(
      `Coming slots of ${queue.name}, in ${queue.timeZone}'s week:`
    );

    for (const line of previewLines(coming)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List a queue's coming slots, each free or taken by a post, and the slot a post added now would take. Nothing is held: the slot is decided when the post is added."
  )
);

const create = Command.make(
  "create",
  {
    channels: channelsFlag(
      `A channel a post added to the queue goes to when it names none, as peal channels list shows its id; repeat it, or separate ids with commas. ${String(maxChannelsPerQueue)} at most.`
    ),
    isDefault: Flag.Boolean("default").pipe(
      Flag.withDescription(
        "Make it the workspace's default queue, the one peal post --default-queue and peal posts queue without --queue take. The first queue of a workspace is its default anyway."
      ),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    name: Argument.String("name").pipe(
      Argument.withDescription(
        `The queue's name: ${String(maxQueueNameLength)} characters at most, on one line, which no other queue of the workspace has, whatever its case.`
      )
    ),
    set: channelSetFlag,
    slots: slotFlag(
      `A slot of the queue's week: a day (mon or monday…) and a time of day on a 24-hour clock, such as mon@09:00; repeat it. ${String(maxSlotsPerQueue)} at most.`
    ),
    workspace: workspaceFlag,
    zone: queueZoneFlag,
  },
  Effect.fn("queues.create")(function* create(input) {
    const slots = yield* slotsOf(input.slots);
    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;

    const set = yield* Option.match(input.set, {
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (given) =>
        findSet(session, given).pipe(Effect.map(({ id }) => Option.some(id))),
    });

    const payload = yield* checkQueue({
      channelIds: channelIdsOf(input.channels),
      ...Option.match(set, {
        onNone: () => ({}),
        onSome: (channelSetId) => ({ channelSetId }),
      }),
      isDefault: input.isDefault,
      name: input.name.trim(),
      slots,
      timeZone: input.zone,
    });

    const made = yield* client.queues
      .create({ params: { workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(QueueSchema, made);

      return;
    }

    yield* Console.log(
      `Created queue ${made.name} in ${workspace.name} (${summary(made)}): ${made.id}.`
    );
  })
).pipe(
  Command.withDescription(
    `Save a queue: a weekly timetable of slots in a time zone, which peal post --queue and peal posts queue put a post on instead of a time: its next free slot. A workspace keeps ${String(maxQueuesPerWorkspace)} queues at most.`
  )
);

const update = Command.make(
  "update",
  {
    channels: channelsFlag(
      "A channel of the queue from now on, as peal channels list shows its id; repeat it: those given replace the queue's. Without it the queue keeps its channels that are still connected, and loses those that are not."
    ),
    clearChannels: Flag.Boolean("clear-channels").pipe(
      Flag.withDescription(
        "Take every channel off the queue: a post added to it then names its channels, or goes to the queue's channel set."
      ),
      Flag.withDefault(false)
    ),
    clearSlots: Flag.Boolean("clear-slots").pipe(
      Flag.withDescription(
        "Take every slot off the queue: nothing can be added to it until it has some again. Posts the queue placed keep their times."
      ),
      Flag.withDefault(false)
    ),
    isDefault: Flag.Boolean("default").pipe(
      Flag.withDescription(
        "Make it the workspace's default queue, instead of the one that was."
      ),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    name: Flag.String("name").pipe(
      Flag.withMetavar("<name>"),
      Flag.withDescription(
        "Another name, which no other queue of the workspace has. The queue keeps its name without it."
      ),
      Flag.optional
    ),
    noSet: Flag.Boolean("no-set").pipe(
      Flag.withDescription("Take the channel set off the queue."),
      Flag.withDefault(false)
    ),
    queue: queueArgument,
    set: channelSetFlag,
    slots: slotFlag(
      "A slot of the queue's week from now on, such as mon@09:00; repeat it: those given replace the queue's. Posts the queue placed keep their times."
    ),
    workspace: workspaceFlag,
    zone: Flag.String("zone").pipe(
      Flag.withAlias("time-zone"),
      Flag.withMetavar("<zone>"),
      Flag.withDescription(
        "Another IANA time zone for the queue's slots. The queue keeps its zone without it."
      ),
      Flag.optional
    ),
  },
  Effect.fn("queues.update")(function* update(input) {
    const givenSlots = yield* slotsOf(input.slots);
    const givenChannels = channelIdsOf(input.channels);

    if (input.clearChannels && givenChannels.length > 0) {
      yield* new Refused({
        reason: "Give --channel or --clear-channels, not both.",
      });
    }

    if (input.clearSlots && givenSlots.length > 0) {
      yield* new Refused({ reason: "Give --slot or --clear-slots, not both." });
    }

    if (
      Option.isNone(input.name) &&
      Option.isNone(input.zone) &&
      Option.isNone(input.set) &&
      !input.noSet &&
      !input.isDefault &&
      !input.clearChannels &&
      !input.clearSlots &&
      givenSlots.length === 0 &&
      givenChannels.length === 0
    ) {
      yield* new Refused({
        reason:
          "Give --name, --zone, --slot, --clear-slots, --channel, --clear-channels, --set, --no-set, --default or several: nothing else of a queue changes.",
      });
    }

    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const queue = yield* findQueue(session, input.queue);

    const set = yield* Option.match(input.set, {
      onNone: () =>
        Effect.succeed(
          input.noSet ? Option.none() : Option.fromNullOr(queue.channelSetId)
        ),
      onSome: (given) =>
        findSet(session, given).pipe(Effect.map(({ id }) => Option.some(id))),
    });

    // What the flags leave out stays as the queue has it, but the channels
    // disconnected since: a queue is saved with connected channels only.
    const payload = yield* checkQueue({
      channelIds:
        input.clearChannels || givenChannels.length > 0
          ? givenChannels
          : queue.channelIds.filter(
              (channelId) => !queue.unavailableChannelIds.includes(channelId)
            ),
      ...Option.match(set, {
        onNone: () => ({}),
        onSome: (channelSetId) => ({ channelSetId }),
      }),
      isDefault: input.isDefault || queue.isDefault,
      name: Option.match(input.name, {
        onNone: () => queue.name,
        onSome: (written) => written.trim(),
      }),
      slots:
        input.clearSlots || givenSlots.length > 0 ? givenSlots : queue.slots,
      timeZone: Option.getOrElse(input.zone, () => queue.timeZone),
    });

    const changed = yield* client.queues
      .update({
        params: { queueId: queue.id, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(QueueSchema, changed);

      return;
    }

    yield* Console.log(
      `Queue ${changed.id} of ${workspace.name} is now ${changed.name} (${summary(changed)}). Posts it placed keep their times: peal queues reshuffle moves them onto its slots.`
    );
  })
).pipe(
  Command.withDescription(
    "Change a queue: its name, zone, slots, channels or channel set, or make it the default. What no flag names stays as it is, but the channels that are no longer connected, which a queue cannot keep. Posts the queue placed keep their times."
  )
);

/** What a reshuffle did, and why it stopped, in a line or two. */
export const reshuffleLines = (
  queue: Queue,
  { moved, remaining, stoppedBy, unchanged }: QueueReshuffle
): readonly string[] => {
  const left = plural(remaining, "post", "posts");

  const stopped: Readonly<Record<ReshuffleStop, string>> = {
    changed: `Stopped as the queue was saved meanwhile: ${left} not moved. Run it again.`,
    full: `${left} found no slot within ${String(queueHorizonDays)} days: add slots with peal queues update --slot, then run it again.`,
    planLimit: `Stopped at a month the plan has no room in: ${left} not moved. peal billing shows the plan.`,
  };

  return [
    `Moved ${plural(moved, "post", "posts")} of ${queue.name} onto its slots; ${String(unchanged)} already on theirs or not yours to move.`,
    ...(stoppedBy === null ? [] : [stopped[stoppedBy]]),
  ];
};

const reshuffle = Command.make(
  "reshuffle",
  { json: jsonFlag, queue: queueArgument, workspace: workspaceFlag },
  Effect.fn("queues.reshuffle")(function* reshuffle({
    json,
    queue: given,
    workspace: choice,
  }) {
    const session = yield* inWorkspace(choice);
    const { client, url, workspace } = session;
    const queue = yield* findQueue(session, given);

    const done = yield* client.queues
      .reshuffle({ params: { queueId: queue.id, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(QueueReshuffleSchema, done);

      return;
    }

    for (const line of reshuffleLines(queue, done)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Move the posts that wait in a queue onto its slots as they are now, after its slots changed: in the order of their times, the first onto the first slot, those moved by hand included. Each move is what peal posts reschedule does, the approval asked again where the workspace asks for one. It stops at a month the plan has no room in; run it again to go on. Run twice, the second moves nothing."
  )
);

const remove = Command.make(
  "delete",
  { json: jsonFlag, queue: queueArgument, workspace: workspaceFlag },
  Effect.fn("queues.delete")(function* remove({
    json,
    queue: given,
    workspace: choice,
  }) {
    const session = yield* inWorkspace(choice);
    const { client, url, workspace } = session;
    const queue = yield* findQueue(session, given);

    yield* client.queues
      .delete({ params: { queueId: queue.id, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
          `Deleted queue ${queue.name} of ${workspace.name}: the posts it placed stay scheduled at their times.`
        );
  })
).pipe(
  Command.withDescription(
    "Delete a queue for good. The posts it placed stay scheduled at their times, without it."
  )
);

export const queues = Command.make("queues").pipe(
  Command.withDescription(
    "A workspace's queues: weekly timetables of slots in a time zone. peal post --queue and peal posts queue put a post on a queue's next free slot instead of a time; a slot is taken while a post of the queue is scheduled, held for an approval or publishing at its instant."
  ),
  Command.withSubcommands([
    list,
    show,
    preview,
    create,
    update,
    reshuffle,
    remove,
  ])
);
