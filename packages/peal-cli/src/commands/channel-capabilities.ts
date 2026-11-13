import { Console, Effect, Match, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ChannelCapabilitiesSchema,
  LookupDescriptionSchema,
  LookupResultSchema,
  PlatformCapabilitiesSchema,
} from "peal-contract";
import type {
  AccountRestriction,
  AccountStanding,
  FieldDescription,
  LookupDescription,
  LookupInput,
  LookupResult,
  MediaFormat,
  OptionConstraint,
  PlatformCapabilities,
  TikTokAccount,
} from "peal-contract";

import { explain } from "#explain.ts";
import { columns } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const jsonFlag = Flag.Boolean("json").pipe(
  Flag.withDescription(
    "Print the server's answer as JSON, for scripts, rather than as text."
  ),
  Flag.withDefault(false)
);

// The server's answer, as the API sends it.
const printJson = <A, I>(schema: Schema.Codec<A, I>, value: A) =>
  Schema.encodeEffect(schema)(value).pipe(
    Effect.orDie,
    Effect.flatMap((encoded) => Console.log(JSON.stringify(encoded, null, 2)))
  );

const mebibyte = 1024 * 1024;

const gibibyte = 1024 * mebibyte;

// Bytes as people read them: whole gibibytes or mebibytes where they are,
// bytes otherwise.
const bytes = (count: number): string => {
  if (count >= gibibyte && count % gibibyte === 0) {
    return `${String(count / gibibyte)} GiB`;
  }

  return count >= mebibyte && count % mebibyte === 0
    ? `${String(count / mebibyte)} MiB`
    : `${String(count)} bytes`;
};

const seconds = (milliseconds: number): string =>
  `${String(milliseconds / 1000)} seconds`;

// One of a format's limits, if it has it.
const limit = <A>(value: A | null, say: (given: A) => string): string[] =>
  value === null ? [] : [say(value)];

const formatLimits = (format: MediaFormat): string =>
  [
    ...limit(format.maxByteSize, (most) => `up to ${bytes(most)}`),
    ...limit(format.minByteSize, (least) => `at least ${bytes(least)}`),
    ...limit(format.maxPixels, (most) => `${String(most)} pixels`),
    ...limit(format.minSide, (least) => `sides from ${String(least)} pixels`),
    ...limit(format.maxSide, (most) => `sides up to ${String(most)} pixels`),
    ...limit(format.minDurationMs, (least) => `at least ${seconds(least)}`),
    ...limit(format.maxDurationMs, (most) => `up to ${seconds(most)}`),
    ...limit(
      format.minAspectRatio,
      (least) => `width to height from ${String(least)}`
    ),
    ...limit(
      format.maxAspectRatio,
      (most) => `width to height up to ${String(most)}`
    ),
    ...limit(
      format.maxMediaWith,
      (most) => `${String(most)} to a post holding one`
    ),
  ].join(", ");

const textLines = ({ text }: PlatformCapabilities): readonly string[] => [
  `Text: at most ${text.limits.map(({ maximum, unit }) => `${String(maximum)} ${unit}`).join(", ")}.`,
  ...limit(text.maxHashtags, (most) => `  ${String(most)} hashtags at most.`),
  ...limit(text.maxMentions, (most) => `  ${String(most)} mentions at most.`),
  ...limit(
    text.maxLinks,
    (most) => `  ${String(most)} different links at most.`
  ),
  ...(text.forbiddenCharacters.length === 0
    ? []
    : [`  Never: ${text.forbiddenCharacters.join(" ")}`]),
];

const mixing = (mixesKinds: boolean | null): string[] =>
  limit(mixesKinds, (mixes) =>
    mixes ? "images and videos together" : "never images and videos together"
  );

const mediaLines = ({ media }: PlatformCapabilities): readonly string[] => [
  `Media: ${[
    media.required ? "needed" : "optional",
    `up to ${String(media.maxCount)} images and videos`,
    ...limit(media.maxVideos, (most) => `${String(most)} video at most`),
    ...mixing(media.mixesKinds),
  ].join(", ")}.`,
  media.altText.shown === false
    ? "  Alt text is not shown there."
    : `  Alt text up to ${String(media.altText.maxLength)} characters.`,
  ...(media.formats === null
    ? ["  Peal knows none of its file rules yet: the platform checks them."]
    : columns(
        media.formats.map((format) => [
          `  ${format.contentType}`,
          formatLimits(format),
        ])
      )),
];

const fieldNotes = (field: FieldDescription): string =>
  [
    ...(field.contentTypes.length === 0
      ? []
      : [`the id of a library file: ${field.contentTypes.join(" or ")}`]),
    ...limit(field.maxByteSize, (most) => `up to ${String(most)} bytes`),
    ...(field.values.length === 0 ? [] : [`one of ${field.values.join(", ")}`]),
    ...limit(field.maxLength, (most) => `up to ${String(most)} characters`),
    ...limit(field.minimum, (least) => `from ${String(least)}`),
    ...limit(field.maximum, (most) => `up to ${String(most)}`),
    ...(field.forbiddenCharacters.length === 0
      ? []
      : [`never ${field.forbiddenCharacters.join(" ")}`]),
    ...limit(field.pattern, (pattern) => `matching ${pattern}`),
    ...limit(field.ifLeftOut, (value) => `${String(value)} when left out`),
    ...limit(field.lookup, (name) => `values from the lookup ${name}`),
  ].join("; ");

const constraintLine = (constraint: OptionConstraint): string =>
  Match.valueTags(constraint, {
    neededWith: ({ field, other, values }) =>
      `  ${field} is needed when ${other} is ${values.join(" or ")}.`,
    needsOneOf: ({ field, oneOf }) =>
      `  When ${field} is true, one of ${oneOf.join(", ")} must be true.`,
    notWith: ({ field, other, value }) =>
      `  ${field} cannot be true while ${other} is ${value}.`,
    onlyWith: ({ field, other, values }) =>
      `  ${field} is taken only when ${other} is ${values.join(" or ")}.`,
  });

const optionLines = ({ options }: PlatformCapabilities): readonly string[] =>
  options.fields.length === 0
    ? ["Options: none."]
    : [
        "Options (a draft's --options on this channel):",
        ...columns(
          options.fields.map((field) => [
            `  ${field.name}`,
            field.type,
            field.required ? "required" : "optional",
            fieldNotes(field),
          ])
        ),
        ...options.constraints.map(constraintLine),
      ];

// The flags of `peal channels lookup` that fill each input field.
const inputFlags: Readonly<Record<keyof LookupInput, string>> = {
  boardId: "--board",
  cursor: "--cursor",
  language: "--language",
  limit: "--limit",
  regionCode: "--region",
  vanityName: "--vanity-name",
};

const isInput = (name: string): name is keyof LookupInput => name in inputFlags;

const lookupRows = (
  lookups: readonly LookupDescription[]
): readonly (readonly string[])[] =>
  lookups.map(({ fills, input, name }) => [
    `  ${name}`,
    [
      ...(fills.length === 0 ? [] : [`fills ${fills.join(", ")}`]),
      ...(input.length === 0
        ? []
        : [
            `takes ${input
              .map((field) =>
                isInput(field.name) ? inputFlags[field.name] : field.name
              )
              .join(", ")}`,
          ]),
    ].join("  "),
  ]);

const restrictionLine = (restriction: AccountRestriction): string =>
  Match.valueTags(restriction, {
    mediaTypesRefused: ({ contentTypes }) =>
      `  Refused on this channel: ${contentTypes.join(", ")}.`,
    optionFixed: ({ field, value }) => `  ${field} must be ${String(value)}.`,
    optionNeedsReconnect: ({ field }) =>
      `  ${field} needs the account reconnected in the web app.`,
    optionValues: ({ field, values }) =>
      `  ${field} takes only ${values.join(", ")}.`,
    partsNeedReconnect: () =>
      "  A first comment needs the account reconnected in the web app.",
    videoDuration: ({ maximumMs }) =>
      `  Videos last ${seconds(maximumMs)} at most.`,
  });

const blocks: Readonly<
  Record<
    NonNullable<Extract<AccountStanding, { _tag: "read" }>["blocked"]>,
    string
  >
> = {
  banned: "the platform bars this account from posting",
  clientLimit: "this server's app reached its count of accounts for the day",
  postLimit: "the account posted as much as the platform allows today",
};

const unread: Readonly<
  Record<Extract<AccountStanding, { _tag: "unread" }>["reason"], string>
> = {
  disabled: "the channel is turned off",
  disconnected: "the channel was disconnected",
  platformUnreachable: "the platform did not answer",
  rateLimited: "the platform asked to slow down",
  reconnect: "the channel must be reconnected",
};

const accountLines = (account: AccountStanding): readonly string[] =>
  Match.valueTags(account, {
    read: ({ blocked, restrictions }) => [
      blocked === null
        ? "This account, as its platform says now:"
        : `This account cannot post now: ${blocks[blocked]}.`,
      ...restrictions.map(restrictionLine),
    ],
    unread: ({ reason }) => [
      `The account's own restrictions could not be read: ${unread[reason]}. Peal checks them when a post is scheduled.`,
    ],
    unrestricted: () => [],
  });

// The parts after the first, where the platform takes any.
const partsLine = ({ followUps }: PlatformCapabilities): string => {
  if (followUps === null) {
    return "Parts: a post alone, with no part after it.";
  }

  if (followUps.kind === "thread") {
    return `Parts: a thread of ${String(followUps.maxCount + 1)} parts at most (--then).`;
  }

  const limits = (followUps.commentTextLimits ?? [])
    .map(({ maximum, unit }) => `${String(maximum)} ${unit}`)
    .join(", ");

  return `Parts: a first comment under the post (--then), text alone, at most ${limits}.`;
};

// The poll, where the platform takes one.
const pollLines = ({ poll }: PlatformCapabilities): readonly string[] => {
  if (poll === undefined) {
    return [];
  }

  const open =
    poll.durationMinutes === null
      ? "open as long as the platform decides"
      : `open ${String(poll.durationMinutes.minimum)} to ${String(poll.durationMinutes.maximum)} minutes (--poll-minutes)`;

  const several = poll.multipleChoice
    ? ", several picks allowed (--poll-multiple)"
    : "";

  return [
    `Poll: ${String(poll.minChoices)} to ${String(poll.maxChoices)} choices of ${String(poll.choiceLimit.maximum)} ${poll.choiceLimit.unit} at most (--poll-choice), ${open}${several}, no media.`,
  ];
};

const platformLines = (
  capabilities: PlatformCapabilities
): readonly string[] => [
  ...textLines(capabilities),
  partsLine(capabilities),
  ...pollLines(capabilities),
  ...mediaLines(capabilities),
  ...optionLines(capabilities),
  ...(capabilities.lookups.length === 0
    ? []
    : [
        "Lookups (peal channels lookup):",
        ...columns(lookupRows(capabilities.lookups)),
      ]),
  capabilities.analytics.perPost
    ? `Analytics: Peal reads each post's counts (${capabilities.analytics.postCounts.join(", ")}).`
    : "Analytics: Peal reads no counts there.",
  ...(capabilities.analytics.accountNumbers.length === 0
    ? []
    : [
        `Account: Peal reads its ${capabilities.analytics.accountNumbers.join(", ")}, once a day.`,
      ]),
];

// A platform on one line: its text limits, media, options and lookups.
const summaryRow = (capabilities: PlatformCapabilities): readonly string[] => {
  const { fields } = capabilities.options;

  const named = [
    ...fields.filter((field) => field.required),
    ...fields.filter((field) => !field.required),
  ].map((field) => (field.required ? `${field.name}*` : field.name));

  return [
    `  ${capabilities.platform}`,
    `text: ${capabilities.text.limits.map(({ maximum, unit }) => `${String(maximum)} ${unit}`).join(", ")}`,
    `media: ${capabilities.media.required ? "needed, " : ""}up to ${String(capabilities.media.maxCount)}`,
    named.length === 0 ? "" : `options: ${named.join(", ")}`,
    capabilities.lookups.length === 0
      ? ""
      : `lookups: ${capabilities.lookups.map(({ name }) => name).join(", ")}`,
  ];
};

const channelArgument = Argument.String("channel-id").pipe(
  Argument.withDescription("The channel, as peal channels list shows its id.")
);

export const capabilities = Command.make(
  "capabilities",
  {
    channelId: channelArgument.pipe(Argument.optional),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("channels.capabilities")(function* capabilities({
    channelId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    if (Option.isNone(channelId)) {
      const platforms = yield* client.capabilities
        .platforms({ params: { workspaceId: workspace.id } })
        .pipe(Effect.mapError(explain(url)));

      if (json) {
        yield* printJson(Schema.Array(PlatformCapabilitiesSchema), platforms);

        return;
      }

      yield* Console.log("What a post may hold, by platform:");

      for (const line of columns(platforms.map(summaryRow))) {
        yield* Console.log(line);
      }

      yield* Console.log(
        "* required to schedule. Name a channel for its file types, options and account: peal channels capabilities <channel-id>."
      );

      return;
    }

    const described = yield* client.capabilities
      .channel({
        params: { channelId: channelId.value, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(ChannelCapabilitiesSchema, described);

      return;
    }

    yield* Console.log(
      `What a post on ${described.capabilities.platform} may hold, as Peal checks it before the post goes out:`
    );

    for (const line of [
      ...platformLines(described.capabilities),
      ...accountLines(described.account),
    ]) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show what a post on a channel may hold: how its text is counted and limited, the media it takes, its platform's options, the lookups that answer their values, and what the account itself restricts, read from the platform now. Without a channel, sums up every platform."
  )
);

/** A TikTok creator, as `peal channels tiktok` shows them. */
export type CreatorLines = (account: TikTokAccount) => readonly string[];

const resultLines = (
  result: LookupResult,
  creatorLines: CreatorLines
): readonly string[] =>
  Match.valueTags(result, {
    linkedinOrganizations: ({ items }) =>
      items.length === 0
        ? ["LinkedIn has no page of that name."]
        : columns(
            items.map(({ name, urn, vanityName }) => [
              urn,
              name,
              vanityName ?? "",
            ])
          ),
    pinterestBoardSections: ({ items }) =>
      items.length === 0
        ? ["The board has no sections on this page."]
        : columns(items.map(({ id, name }) => [id, name])),
    pinterestBoards: ({ items }) =>
      items.length === 0
        ? ["The account has no boards on this page."]
        : columns(
            items.map(({ id, name, privacy }) => [id, name, privacy ?? ""])
          ),
    tiktokCreator: ({ items }) => items.flatMap(creatorLines),
    youtubePlaylists: ({ items }) =>
      items.length === 0
        ? ["The channel has no playlists."]
        : columns(
            items.map(({ id, privacy, title }) => [id, title, privacy ?? ""])
          ),
    youtubeVideoCategories: ({ items }) =>
      items.length === 0
        ? ["YouTube lists no categories for this region."]
        : columns(items.map(({ id, title }) => [id, title])),
  });

// Arguments are read in the order of their keys: the channel, then the
// lookup's name.
export const lookupWith = (creatorLines: CreatorLines) =>
  Command.make(
    "lookup",
    {
      board: Flag.String("board").pipe(
        Flag.withMetavar("<board-id>"),
        Flag.withDescription(
          "The Pinterest board whose sections are listed, by its id."
        ),
        Flag.optional
      ),
      channelId: channelArgument,
      cursor: Flag.String("cursor").pipe(
        Flag.withDescription(
          "The page to read, as the page before named it under More."
        ),
        Flag.optional
      ),
      json: jsonFlag,
      language: Flag.String("language").pipe(
        Flag.withMetavar("<tag>"),
        Flag.withDescription(
          "The language titles come in, such as fr or pt-BR."
        ),
        Flag.optional
      ),
      limit: Flag.Int("limit").pipe(
        Flag.withDescription("How many items a page holds: 25, 50 at most."),
        Flag.optional
      ),
      name: Argument.String("lookup").pipe(
        Argument.withDescription(
          "The lookup to run, as this command lists them without it."
        ),
        Argument.optional
      ),
      region: Flag.String("region").pipe(
        Flag.withMetavar("<country>"),
        Flag.withDescription(
          "A country as two capital letters, such as FR: US when left out."
        ),
        Flag.optional
      ),
      vanityName: Flag.String("vanity-name").pipe(
        Flag.withMetavar("<name>"),
        Flag.withDescription(
          "The name in a LinkedIn page's address, linkedin.com/company/<name>, to find the page a post mentions."
        ),
        Flag.optional
      ),
      workspace: workspaceFlag,
    },
    Effect.fn("channels.lookup")(function* lookup(given) {
      const { client, url, workspace } = yield* inWorkspace(given.workspace);
      const params = { channelId: given.channelId, workspaceId: workspace.id };

      if (Option.isNone(given.name)) {
        const listed = yield* client.lookups
          .list({ params })
          .pipe(Effect.mapError(explain(url)));

        if (given.json) {
          yield* printJson(Schema.Array(LookupDescriptionSchema), listed);

          return;
        }

        if (listed.length === 0) {
          yield* Console.log(
            "This channel's platform has no lookups: its options, if any, take fixed values (peal channels capabilities)."
          );

          return;
        }

        yield* Console.log(
          "This channel's lookups, to run with peal channels lookup <channel-id> <lookup>:"
        );

        for (const line of columns(lookupRows(listed))) {
          yield* Console.log(line);
        }

        return;
      }

      const payload: LookupInput = {
        ...Option.match(given.board, {
          onNone: () => ({}),
          onSome: (boardId) => ({ boardId }),
        }),
        ...Option.match(given.cursor, {
          onNone: () => ({}),
          onSome: (cursor) => ({ cursor }),
        }),
        ...Option.match(given.language, {
          onNone: () => ({}),
          onSome: (language) => ({ language }),
        }),
        ...Option.match(given.limit, {
          onNone: () => ({}),
          onSome: (most) => ({ limit: most }),
        }),
        ...Option.match(given.region, {
          onNone: () => ({}),
          onSome: (regionCode) => ({ regionCode }),
        }),
        ...Option.match(given.vanityName, {
          onNone: () => ({}),
          onSome: (vanityName) => ({ vanityName }),
        }),
      };

      const result = yield* client.lookups
        .run({ params: { ...params, name: given.name.value }, payload })
        .pipe(Effect.mapError(explain(url)));

      if (given.json) {
        yield* printJson(LookupResultSchema, result);

        return;
      }

      for (const line of resultLines(result, creatorLines)) {
        yield* Console.log(line);
      }

      if (result.nextCursor !== null) {
        yield* Console.log(`More: add --cursor ${result.nextCursor}`);
      }
    })
  ).pipe(
    Command.withDescription(
      "Ask a channel's platform for account data a post's options refer to, such as the categories a YouTube video can be filed under. Without a lookup, lists those the channel has. It changes nothing."
    )
  );
