import { Effect, Option, Schema, Stream } from "effect";
import { HttpServerResponse } from "effect/http";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentPrincipal,
  defaultAgendaPageSize,
  defaultReportDays,
  InvalidTimeRange,
  InvalidTimeZone,
  maxOverviewPageSize,
  reportColumns,
  Unauthenticated,
} from "peal-contract";
import type {
  AgendaItem,
  WorkspaceAnalytics,
  WorkspaceOverview as OverviewView,
  WorkspaceReport as ReportView,
} from "peal-contract";

import { csvLine } from "#shared/api/csv.ts";
import type { Cell } from "#shared/api/csv.ts";
import { forbidden, personRequired } from "#shared/api/forbidden.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { isoDateOf } from "#shared/domain/wall-clock.ts";
import type {
  ReportAsked,
  ReportFigures,
  ReportFollowers,
  ReportTotals,
} from "#workspace/application/overview-sources.ts";
import {
  maxOverviewPageSize as pageOfReport,
  Overview,
} from "#workspace/application/overview.ts";
import type {
  AgendaItem as Agended,
  ReportPage,
  WorkspaceOverview,
  WorkspaceReport,
} from "#workspace/application/overview.ts";

import { userPrincipalOf } from "./principal.ts";

const decodeWorkspaceIds = Schema.decodeUnknownEffect(
  Schema.Array(WorkspaceIdSchema)
);

const overviewView = ({
  channels,
  inbox,
  overPlan,
  posts,
  refused,
  workspace,
}: WorkspaceOverview): OverviewView => ({
  channels: Option.getOrNull(channels),
  id: workspace.id,
  inbox: Option.getOrNull(inbox),
  name: workspace.name,
  overPlan: Option.getOrNull(overPlan),
  posts: Option.getOrNull(posts),
  refused: Option.getOrNull(refused),
  role: workspace.role,
  slug: workspace.slug,
});

const agendaView = ({ platforms, ...item }: Agended): AgendaItem => ({
  ...item,
  platforms: platforms.pipe(
    Option.map((listed) => [...listed]),
    Option.getOrNull
  ),
});

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const totalsView = (totals: ReportTotals) => ({
  clicks: Option.getOrNull(totals.clicks),
  engagement: totals.engagement,
  impressions: Option.getOrNull(totals.impressions),
  likes: totals.likes,
  posts: totals.posts,
  quotes: Option.getOrNull(totals.quotes),
  reach: Option.getOrNull(totals.reach),
  replies: totals.replies,
  reposts: totals.reposts,
  saves: Option.getOrNull(totals.saves),
});

const followersView = (followers: ReportFollowers) => ({
  current: Option.getOrNull(followers.current),
  gained: Option.getOrNull(followers.gained),
});

const analyticsView = (figures: ReportFigures): WorkspaceAnalytics => ({
  followers: followersView(figures.followers),
  previousFollowers: followersView(figures.previousFollowers),
  previousKept: figures.previousKept,
  previousTotals: totalsView(figures.previousTotals),
  totals: totalsView(figures.totals),
});

const reportView = ({
  analytics,
  refused,
  workspace,
}: WorkspaceReport): ReportView => ({
  analytics: analytics.pipe(Option.map(analyticsView), Option.getOrNull),
  id: workspace.id,
  name: workspace.name,
  refused: Option.getOrNull(refused),
  role: workspace.role,
  slug: workspace.slug,
});

// The report's range: the last `days`, ending today in a zone the server
// knows.
const reportAsked = (query: {
  readonly days?: 7 | 30 | 90;
  readonly timeZone: string;
}): Effect.Effect<ReportAsked, InvalidTimeZone> =>
  Option.match(decodeTimeZone(query.timeZone), {
    onNone: () =>
      Effect.fail(new InvalidTimeZone({ timeZone: query.timeZone })),
    onSome: (timeZone) =>
      Effect.succeed({ days: query.days ?? defaultReportDays, timeZone }),
  });

const totalCells = (totals: ReportTotals): Cell[] => [
  totals.posts,
  totals.likes,
  totals.reposts,
  totals.replies,
  Option.getOrNull(totals.quotes),
  Option.getOrNull(totals.impressions),
  Option.getOrNull(totals.clicks),
  Option.getOrNull(totals.reach),
  Option.getOrNull(totals.saves),
  totals.engagement,
];

const followerCells = (followers: ReportFollowers): Cell[] => [
  Option.getOrNull(followers.current),
  Option.getOrNull(followers.gained),
];

// What a workspace whose analytics are not read writes: nothing, in each
// of a range's columns.
const blanks = (count: number): Cell[] =>
  Array.from({ length: count }, () => null);

/** A workspace's line of the report's CSV, in the order of `reportColumns`. */
const reportCells = (
  page: Pick<ReportPage, "range">,
  { analytics, workspace }: WorkspaceReport
): readonly Cell[] => [
  workspace.id,
  workspace.name,
  isoDateOf(page.range.from),
  isoDateOf(page.range.to),
  ...Option.match(analytics, {
    onNone: () => blanks(reportColumns.length - 4),
    onSome: (figures) => [
      ...totalCells(figures.totals),
      ...followerCells(figures.followers),
      String(figures.previousKept),
      // No figure of a range before that was not all kept.
      ...(figures.previousKept
        ? [
            ...totalCells(figures.previousTotals),
            ...followerCells(figures.previousFollowers),
          ]
        : blanks(12)),
    ],
  }),
];

// Who reads across workspaces: a user, never a key, which belongs to a
// workspace and not to anyone.
const currentPerson = Effect.gen(function* currentPerson() {
  const principal = yield* CurrentPrincipal;

  return principal._tag === "user"
    ? userPrincipalOf(principal)
    : yield* personRequired();
});

const refusals = {
  BannedUser: forbidden,
  DatabaseError: Effect.die,
  DirectoryUnavailable: Effect.die,
  InvalidOverviewCursor: () => Effect.fail(new HttpApiError.BadRequest()),
  NotSignedIn: () => Effect.fail(new Unauthenticated()),
  PersonRequired: forbidden,
} as const;

// The workspaces a comma-separated list names; any id that cannot be a
// workspace's is a bad request.
const workspaceIdsFrom = (written: string | undefined) =>
  written === undefined
    ? Effect.succeedNone
    : decodeWorkspaceIds(
        written
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "")
      ).pipe(
        Effect.asSome,
        Effect.mapError(() => new HttpApiError.BadRequest())
      );

export const OverviewHandlers = HttpApiBuilder.group(
  Api,
  "overview",
  Effect.fn(function* overviewHandlers(handlers) {
    const overview = yield* Overview;

    return handlers.handleAll({
      agenda: ({ query }) =>
        Effect.gen(function* agenda() {
          const person = yield* currentPerson;
          const workspaceIds = yield* workspaceIdsFrom(query.workspaceIds);

          const page = yield* overview
            .agenda(person, {
              cursor: Option.fromUndefinedOr(query.cursor),
              from: query.from,
              limit: query.limit ?? defaultAgendaPageSize,
              to: query.to,
              workspaceIds,
            })
            .pipe(
              Effect.catchTags({
                ...refusals,
                InvalidAgendaRange: () => Effect.fail(new InvalidTimeRange()),
              })
            );

          return {
            items: page.items.map(agendaView),
            nextCursor: Option.getOrNull(page.next),
          };
        }),
      get: ({ query }) =>
        Effect.gen(function* get() {
          const person = yield* currentPerson;

          const page = yield* overview
            .page(person, {
              cursor: Option.fromUndefinedOr(query.cursor),
              limit: query.limit ?? maxOverviewPageSize,
            })
            .pipe(Effect.catchTags(refusals));

          return {
            generatedAt: page.generatedAt,
            nextCursor: Option.getOrNull(page.next),
            workspaces: page.workspaces.map(overviewView),
          };
        }),
      report: ({ query }) =>
        Effect.gen(function* report() {
          const person = yield* currentPerson;
          const asked = yield* reportAsked(query);

          const page = yield* overview
            .report(person, {
              asked,
              cursor: Option.fromUndefinedOr(query.cursor),
              limit: query.limit ?? maxOverviewPageSize,
            })
            .pipe(Effect.catchTags(refusals));

          return {
            from: isoDateOf(page.range.from),
            nextCursor: Option.getOrNull(page.next),
            previous: {
              from: isoDateOf(page.previous.from),
              to: isoDateOf(page.previous.to),
            },
            timeZone: asked.timeZone,
            to: isoDateOf(page.range.to),
            workspaces: page.workspaces.map(reportView),
          };
        }),
      reportExport: ({ query }) =>
        Effect.gen(function* reportExport() {
          const person = yield* currentPerson;
          const asked = yield* reportAsked(query);

          const pageAfter = (cursor: Option.Option<string>) =>
            overview.report(person, { asked, cursor, limit: pageOfReport });

          // The first page is read before the answer starts, so a refusal
          // is answered as one, never as a file cut short.
          const first = yield* pageAfter(Option.none()).pipe(
            // The export pages by cursors of its own making.
            Effect.catchTags({ ...refusals, InvalidOverviewCursor: Effect.die })
          );

          // Then a page of workspaces at a time, as the file is sent.
          const rest = Stream.paginate(first.next, (cursor) =>
            Option.match(cursor, {
              onNone: () => Effect.succeed([[], Option.none()] as const),
              onSome: (after) =>
                pageAfter(Option.some(after)).pipe(
                  Effect.map(
                    (page) =>
                      [
                        page.workspaces.map((workspace) =>
                          csvLine(reportCells(page, workspace))
                        ),
                        page.next.pipe(Option.map(Option.some)),
                      ] as const
                  )
                ),
            })
          );

          const lines = Stream.concat(
            Stream.make(
              csvLine(reportColumns),
              ...first.workspaces.map((workspace) =>
                csvLine(reportCells(first, workspace))
              )
            ),
            rest
          ).pipe(Stream.encodeText, Stream.orDie);

          return HttpServerResponse.stream(lines, {
            contentType: "text/csv; charset=utf-8",
            headers: {
              "cache-control": "no-store",
              "content-disposition": `attachment; filename="peal-report-${String(asked.days)}-days.csv"`,
            },
          });
        }),
    });
  })
);
