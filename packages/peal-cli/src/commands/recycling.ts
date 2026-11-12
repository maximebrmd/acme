import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  maxOccurrences,
  maxRecyclingInterval,
  maxRecyclingVariants,
  minOccurrences,
  RecyclingRulePageSchema,
  RecyclingRuleSchema,
  RecyclingStatusSchema,
} from "peal-contract";
import type {
  RecyclingInterval,
  RecyclingRule,
  RecyclingRuleChange,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { findQueue } from "#saved-items.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const ruleArgument = Argument.String("rule").pipe(
  Argument.withDescription(
    "The recycling rule, by its id, as peal recycling list shows it."
  )
);

const units = {
  d: "days",
  m: "months",
  w: "weeks",
} as const satisfies Readonly<Record<string, RecyclingInterval["unit"]>>;

const isUnitLetter = (letter: string): letter is keyof typeof units =>
  letter in units;

const everyPattern = /^(?<count>\d{1,3})(?<unit>[dwm])$/u;

/** `--every 2w`: a count of days (d), weeks (w) or months (m). */
export const intervalOf = (
  given: string
): Effect.Effect<RecyclingInterval, Refused> => {
  const groups = everyPattern.exec(given.trim().toLowerCase())?.groups;
  const letter = groups?.["unit"] ?? "";
  const unit = isUnitLetter(letter) ? units[letter] : undefined;
  const count = Number(groups?.["count"] ?? "0");

  return unit === undefined || count < 1 || count > maxRecyclingInterval[unit]
    ? Effect.fail(
        new Refused({
          reason: `--every takes a count and a unit: 1d to ${String(maxRecyclingInterval.days)}d, 1w to ${String(maxRecyclingInterval.weeks)}w or 1m to ${String(maxRecyclingInterval.months)}m, such as 2w: not ${given}.`,
        })
      )
    : Effect.succeed({ count, unit });
};

const everyLine = ({ count, unit }: RecyclingInterval) =>
  `every ${String(count)} ${count === 1 ? unit.slice(0, -1) : unit}`;

// Where a rule is, in a few words.
const summary = (rule: RecyclingRule): string =>
  [
    everyLine(rule.every),
    rule.count === null
      ? `${String(rule.made)} made`
      : `${String(rule.made)} of ${String(rule.count)}`,
    rule.until === null ? undefined : `until ${rule.until}`,
    rule.status === "ended"
      ? `ended: ${rule.endedReason ?? "stopped"}`
      : rule.status,
  ]
    .filter((part) => part !== undefined)
    .join(", ");

const comingLines = (rule: RecyclingRule) =>
  rule.coming.map(
    ({ at, occurrence, variant }) =>
      `  ${instant(at)}  post ${String(occurrence)}${variant === null ? "" : `, variant ${String(variant)}`}`
  );

const variantFlag = Flag.String("variant").pipe(
  Flag.withMetavar("<text>"),
  Flag.withDescription(
    `A text a post of the rule says instead of the source's, taken in turn after it; repeat it, ${String(maxRecyclingVariants)} at most. Media, later parts and options stay the source's.`
  ),
  Flag.atLeast(0)
);

const countFlag = Flag.Int("count").pipe(
  Flag.withMetavar("<posts>"),
  Flag.withDescription(
    `How many posts in all, the source counted: ${String(minOccurrences)} to ${String(maxOccurrences)}.`
  ),
  Flag.optional
);

const untilFlag = Flag.String("until").pipe(
  Flag.withMetavar("<YYYY-MM-DD>"),
  Flag.withDescription(
    "The last day the rule makes a post on, in the source's time zone."
  ),
  Flag.optional
);

const variantsOf = (given: readonly string[]) =>
  given.map((text) => ({ text }));

const printRule = (rule: RecyclingRule, json: boolean, said: string) =>
  json
    ? printJson(RecyclingRuleSchema, rule)
    : Effect.gen(function* printed() {
        yield* Console.log(`${said} (${summary(rule)}): ${rule.id}.`);

        for (const line of comingLines(rule)) {
          yield* Console.log(line);
        }
      });

const list = Command.make(
  "list",
  {
    json: jsonFlag,
    status: Flag.Literals("status", RecyclingStatusSchema.literals).pipe(
      Flag.withDescription("Only the rules with this status."),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("recycling.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.recycling
      .list({
        params: { workspaceId: workspace.id },
        query: Option.match(input.status, {
          onNone: () => ({}),
          onSome: (status) => ({ status }),
        }),
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(RecyclingRulePageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `${workspace.name} repeats no post: peal recycling start makes one repeat.`
      );

      return;
    }

    yield* Console.log(`Recycling rules of ${workspace.name}:`);

    for (const rule of page.items) {
      yield* Console.log(
        `  ${rule.id}  post ${rule.sourcePostId}  ${summary(rule)}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's recycling rules: what each repeats, how often, how many it made and where it is."
  )
);

const show = Command.make(
  "show",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  Effect.fn("recycling.show")(function* show(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const rule = yield* client.recycling
      .get({ params: { ruleId: input.rule, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* printRule(
      rule,
      input.json,
      `Rule repeating post ${rule.sourcePostId}`
    );

    if (!input.json) {
      for (const [place, { text }] of rule.variants.entries()) {
        yield* Console.log(`  variant ${String(place + 1)}: ${excerpt(text)}`);
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show a recycling rule, its variants and the next three posts it will make, with the variant each says."
  )
);

const start = Command.make(
  "start",
  {
    count: countFlag,
    every: Flag.String("every").pipe(
      Flag.withMetavar("<count><d|w|m>"),
      Flag.withDescription(
        "How long from one post to the next: days (d), weeks (w) or months (m), such as 2w."
      )
    ),
    json: jsonFlag,
    post: Argument.String("post").pipe(
      Argument.withDescription(
        "The post to repeat, by its id: one scheduled, publishing or that went out."
      )
    ),
    queue: Flag.String("queue").pipe(
      Flag.withMetavar("<id-or-name>"),
      Flag.withDescription(
        "A queue the posts take the first free slot of, from each due time, by its id or its name."
      ),
      Flag.optional
    ),
    until: untilFlag,
    variants: variantFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("recycling.start")(function* start(input) {
    const every = yield* intervalOf(input.every);
    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;

    const queueId = yield* Option.match(input.queue, {
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (given) =>
        findQueue(session, given).pipe(Effect.map(({ id }) => Option.some(id))),
    });

    const rule = yield* client.recycling
      .create({
        params: { workspaceId: workspace.id },
        payload: {
          every,
          postId: input.post,
          ...Option.match(input.count, {
            onNone: () => ({}),
            onSome: (count) => ({ count }),
          }),
          ...Option.match(queueId, {
            onNone: () => ({}),
            onSome: (id) => ({ queueId: id }),
          }),
          ...Option.match(input.until, {
            onNone: () => ({}),
            onSome: (until) => ({ until }),
          }),
          variants: variantsOf(input.variants),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* printRule(
      rule,
      input.json,
      `Post ${rule.sourcePostId} now repeats ${everyLine(rule.every)}`
    );
  })
).pipe(
  Command.withDescription(
    "Make a post repeat: a new post each interval, at the same time of day, until --count posts or the day --until, saying the source's text then each --variant in turn. It publishes again, in public, without anyone being asked each time, unless the workspace asks for approvals."
  )
);

const update = Command.make(
  "update",
  {
    count: countFlag,
    json: jsonFlag,
    noCount: Flag.Boolean("no-count").pipe(
      Flag.withDescription("Take the count away."),
      Flag.withDefault(false)
    ),
    noUntil: Flag.Boolean("no-until").pipe(
      Flag.withDescription("Take the end date away."),
      Flag.withDefault(false)
    ),
    rule: ruleArgument,
    until: untilFlag,
    variants: variantFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("recycling.update")(function* update(input) {
    const payload: {
      -readonly [K in keyof RecyclingRuleChange]: RecyclingRuleChange[K];
    } = {};

    if (Option.isSome(input.count) || input.noCount) {
      payload.count = Option.getOrNull(input.count);
    }

    if (Option.isSome(input.until) || input.noUntil) {
      payload.until = Option.getOrNull(input.until);
    }

    if (input.variants.length > 0) {
      payload.variants = variantsOf(input.variants);
    }

    if (Object.keys(payload).length === 0) {
      yield* new Refused({
        reason:
          "Give --count, --no-count, --until, --no-until, --variant or several: nothing else of a rule changes.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const rule = yield* client.recycling
      .update({
        params: { ruleId: input.rule, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    yield* printRule(rule, input.json, `Rule ${rule.id} changed`);
  })
).pipe(
  Command.withDescription(
    "Change a rule's count, end date or variants: --variant replaces them all. Posts it made keep what they say."
  )
);

// Pauses a rule, or sets it going again.
const pausing = (name: "pause" | "resume") =>
  Command.make(
    name,
    { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
    Effect.fn(`recycling.${name}`)(function* paused(input) {
      const { client, url, workspace } = yield* inWorkspace(input.workspace);
      const params = { ruleId: input.rule, workspaceId: workspace.id };

      const rule = yield* (
        name === "pause"
          ? client.recycling.update({ params, payload: { paused: true } })
          : client.recycling.resume({ params, payload: {} })
      ).pipe(Effect.mapError(explain(url)));

      yield* printRule(
        rule,
        input.json,
        name === "pause" ? `Paused rule ${rule.id}` : `Resumed rule ${rule.id}`
      );
    })
  ).pipe(
    Command.withDescription(
      name === "pause"
        ? "Pause a rule: it makes no post until it is resumed. A post it made already stays scheduled."
        : "Set a paused rule going again, or one that ended for a reason that can be put right (the plan's room, a refused text, its channels, its queue's slots): the next post is due at the first due time from now."
    )
  );

const end = Command.make(
  "end",
  { json: jsonFlag, rule: ruleArgument, workspace: workspaceFlag },
  Effect.fn("recycling.end")(function* end(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    yield* client.recycling
      .delete({ params: { ruleId: input.rule, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(
          `Ended rule ${input.rule}: it makes no more posts, and those it made stay as they are.`
        );
  })
).pipe(
  Command.withDescription(
    "End a rule for good: it makes no more posts. Those it made stay as they are, scheduled ones included."
  )
);

export const recycling = Command.make("recycling").pipe(
  Command.withDescription(
    "Repeating posts: rules that make a new post from a source post at an interval, until a count or a date, with text variants taken in turn. Each post is an ordinary one, which peal posts list --recycling finds."
  ),
  Command.withSubcommands([
    list,
    show,
    start,
    update,
    pausing("pause"),
    pausing("resume"),
    end,
  ])
);
