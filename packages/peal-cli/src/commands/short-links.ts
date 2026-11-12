import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  CalendarDaySchema,
  maxShortLinkPageSize,
  shortLinkClickRetentionDays,
  ShortLinkPageSchema,
  ShortLinkReportSchema,
  ShortLinkStatusSchema,
} from "peal-contract";
import type { CalendarDay, ShortLink, ShortLinkStatus } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const day = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withSchema(CalendarDaySchema),
    Flag.withMetavar("<YYYY-MM-DD>"),
    Flag.withDescription(description),
    Flag.optional
  );

const fromFlag = day(
  "from",
  "The first UTC day the clicks are counted from, included. By default the 30 days that end on --to."
);

const toFlag = day(
  "to",
  "The last UTC day the clicks are counted to, included: today by default."
);

/** The days asked for; the server picks those left out. */
interface DaysAsked {
  from?: CalendarDay;
  to?: CalendarDay;
}

const daysOf = (input: {
  readonly from: Option.Option<CalendarDay>;
  readonly to: Option.Option<CalendarDay>;
}): DaysAsked => {
  const asked: DaysAsked = {};

  if (Option.isSome(input.from)) {
    asked.from = input.from.value;
  }

  if (Option.isSome(input.to)) {
    asked.to = input.to.value;
  }

  return asked;
};

const approximate = `Counts are approximate: automated readers and link previews are left out by their names, and nothing about visitors is kept. Clicks are kept ${String(shortLinkClickRetentionDays)} days.`;

const statusLines = (status: ShortLinkStatus): string[] =>
  status.available
    ? [
        `This server shortens links under ${status.base ?? ""} (${String(status.shortLength ?? 0)} characters): only longer links are replaced, and Pinterest, Instagram and TikTok keep links as written, as does a link to a channel's own platform.`,
        status.byDefault
          ? "New posts ask for short links unless their author says not."
          : "New posts ask for short links only when their author says so (--shorten-links).",
      ]
    : [
        "This server has no short links: its operator has not set PEAL_SHORT_LINK_BASE. Posts go out as written.",
      ];

const status = Command.make(
  "status",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("shortLinks.status")(function* shortLinksStatus(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const answered = yield* client.shortLinks
      .status({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ShortLinkStatusSchema, answered);

      return;
    }

    for (const line of statusLines(answered)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show whether this server shortens links, what a short address looks like, and whether the workspace's new posts ask for short links by default."
  )
);

const setDefault = Command.make(
  "set-default",
  {
    choice: Argument.Literals("choice", ["on", "off"]).pipe(
      Argument.withDescription(
        "on: new posts ask for short links unless their author says not; off: only when they ask."
      )
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("shortLinks.setDefault")(function* shortLinksDefault(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const answered = yield* client.shortLinks
      .setDefault({
        params: { workspaceId: workspace.id },
        payload: { byDefault: input.choice === "on" },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ShortLinkStatusSchema, answered);

      return;
    }

    for (const line of statusLines(answered)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Set whether the workspace's new posts ask for short links by default; each post still chooses. Owners and admins may."
  )
);

const linkRow = (link: ShortLink): string[] => [
  `  ${link.id}`,
  String(link.clicks),
  link.shortUrl ?? "(no short address on this server)",
  link.destination,
  `post ${link.postId}`,
  `channel ${link.channelId}${link.part === 0 ? "" : `, part ${String(link.part + 1)}`}`,
  link.disabled ? "turned off" : "",
];

const list = Command.make(
  "list",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "Only the links this channel's posts went out with."
      ),
      Flag.optional
    ),
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Where the page before ended, as it printed."),
      Flag.optional
    ),
    from: fromFlag,
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many links a page holds, at most ${String(maxShortLinkPageSize)}.`
      ),
      Flag.optional
    ),
    post: Flag.String("post").pipe(
      Flag.withMetavar("<post-id>"),
      Flag.withDescription("Only this post's links."),
      Flag.optional
    ),
    to: toFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("shortLinks.list")(function* listShortLinks(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const query: DaysAsked & {
      channelId?: string;
      cursor?: string;
      limit?: number;
      postId?: string;
    } = daysOf(input);

    if (Option.isSome(input.channel)) {
      query.channelId = input.channel.value;
    }

    if (Option.isSome(input.cursor)) {
      query.cursor = input.cursor.value;
    }

    if (Option.isSome(input.limit)) {
      query.limit = Math.min(
        Math.max(input.limit.value, 1),
        maxShortLinkPageSize
      );
    }

    if (Option.isSome(input.post)) {
      query.postId = input.post.value;
    }

    const page = yield* client.shortLinks
      .list({ params: { workspaceId: workspace.id }, query })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ShortLinkPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `No short links in ${workspace.name} match: a post gets them when it asks (--shorten-links) on a server that has them.`
      );

      return;
    }

    yield* Console.log(
      `Short links in ${workspace.name}, newest first, with their clicks from ${page.period.from} to ${page.period.to} (UTC):`
    );

    for (const line of columns(page.items.map(linkRow))) {
      yield* Console.log(line.trimEnd());
    }

    yield* Console.log(approximate);

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal short-links list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    `List the short links the workspace's posts went out with, newest first, each with its clicks over a period of UTC days (the last 30 by default, 92 at most), by post or channel. Needs analytics:read. ${approximate}`
  )
);

const show = Command.make(
  "show",
  {
    from: fromFlag,
    json: jsonFlag,
    linkId: Argument.String("link-id").pipe(
      Argument.withDescription(
        "The short link, as peal short-links list shows its id."
      )
    ),
    to: toFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("shortLinks.show")(function* showShortLink(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const report = yield* client.shortLinks
      .get({
        params: { linkId: input.linkId, workspaceId: workspace.id },
        query: daysOf(input),
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ShortLinkReportSchema, report);

      return;
    }

    const { link } = report;

    yield* Console.log(
      `${link.shortUrl ?? "(no short address on this server)"} leads to ${link.destination}${link.disabled ? " (turned off)" : ""}.`
    );
    yield* Console.log(
      `${String(link.clicks)} clicks from ${report.period.from} to ${report.period.to} (UTC):`
    );

    for (const line of columns(
      report.days
        .filter(({ clicks }) => clicks > 0)
        .map(({ clicks, day: on }) => [`  ${on}`, String(clicks)])
    )) {
      yield* Console.log(line.trimEnd());
    }

    yield* Console.log(approximate);
  })
).pipe(
  Command.withDescription(
    `Show one short link: where it leads and its clicks each UTC day of a period (the last 30 by default, 92 at most). Needs analytics:read. ${approximate}`
  )
);

export const shortLinks = Command.make("short-links").pipe(
  Command.withDescription(
    "The short links a workspace's posts went out with, and how many times each was followed."
  ),
  Command.withSubcommands([status, setDefault, list, show])
);
