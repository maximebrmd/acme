import { DateTime, Option } from "effect";

import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import type { EmailCatalog, PluralWords } from "./email-catalog.ts";
import {
  catalogs,
  digestLayout,
  escapeHtml,
  fill,
  instantIn,
  keep,
} from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";

/**
 * The week a digest tells, in UTC, as readers' time zones are not known:
 * the seven days from `from` to `to`, and the seven after, to `until`.
 */
export interface DigestWeek {
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
  readonly until: DateTime.Utc;
}

/**
 * The week a digest sent at `at` tells: the one that ended at the last
 * Monday's midnight UTC, `at` itself when it is one, and the one it began.
 */
export const digestWeekOf = (at: DateTime.Utc): DigestWeek => {
  const to = DateTime.startOf(at, "week", { weekStartsOn: 1 });

  return {
    from: DateTime.subtract(to, { days: 7 }),
    to,
    until: DateTime.add(to, { days: 7 }),
  };
};

/**
 * Names a person's digest of a week, so it goes once: ids and a day,
 * never content.
 */
export const digestKeyOf = (userId: UserId, week: DigestWeek): string =>
  `weekly-digest:${userId}:${DateTime.formatIsoDate(week.from)}`;

/** How many posts of each week a workspace's part lists, at most. */
export const digestListed = 5;

/** A post a digest names: its time and the start of its text. */
export interface DigestPost {
  readonly at: DateTime.Utc;
  readonly excerpt: string;
}

/** What a digest counts of a workspace's posts, by the time each had. */
export interface DigestCounts {
  /** Planned in the week after, waiting for an approval. */
  readonly awaitingApproval: number;
  /** Failed on every channel in the week. */
  readonly failed: number;
  /** Scheduled in the week after. */
  readonly scheduled: number;
  /** Ended in the week without knowing whether they went out. */
  readonly unconfirmed: number;
  /** Went out in the week, on every channel or some. */
  readonly wentOut: number;
}

/** Engagement with the week's posts, as analytics last counted it. */
export interface DigestEngagement {
  readonly engagement: number;
  /** None where no platform of the workspace counts them. */
  readonly impressions: Option.Option<number>;
}

/**
 * A workspace's part of a digest: the workspace's own posts, counted and
 * the first of each week named by the start of their text. Never a
 * comment, nor who wrote one.
 */
export interface DigestWorkspace {
  readonly counts: DigestCounts;
  /** None where the reader may not read the workspace's analytics. */
  readonly engagement: Option.Option<DigestEngagement>;
  readonly name: string;
  /** The first of those planned in the week after, by time. */
  readonly planned: readonly DigestPost[];
  /** The first of those that went out in the week, by time. */
  readonly wentOut: readonly DigestPost[];
  readonly workspaceId: WorkspaceId;
}

/** Whether a workspace's part tells anything: nothing counted, nothing sent. */
export const hasNews = ({ counts }: DigestWorkspace): boolean =>
  Object.values(counts).some((count) => count > 0);

/** A workspace's part, with the page it links to. */
export interface LinkedDigestWorkspace extends DigestWorkspace {
  /** The workspace's calendar, in the reader's language. */
  readonly calendarUrl: string;
}

/** A person's digest, as an email in their language. */
export interface DigestEmail {
  /** The pages across their workspaces, in their language. */
  readonly agendaUrl: string;
  readonly locale: Locale;
  /** Where they turn the digest off, in their language. */
  readonly preferencesUrl: string;
  readonly week: DigestWeek;
  readonly workspaces: readonly LinkedDigestWorkspace[];
}

const pluralIn = (locale: Locale, words: PluralWords, count: number) =>
  fill(
    new Intl.PluralRules(locale).select(count) === "one"
      ? words.one
      : words.other,
    new Map([["count", new Intl.NumberFormat(locale).format(count)]]),
    keep
  );

// A day as the digest writes it, in UTC: `to` and `until` are excluded, so
// the last day is the one before.
const dayIn = (instant: DateTime.Utc, locale: Locale) =>
  DateTime.format(instant, { dateStyle: "long", locale, timeZone: "UTC" });

const lastDayBefore = (instant: DateTime.Utc) =>
  DateTime.subtract(instant, { days: 1 });

// One part, in the words of the reader's catalog, as text lines; the HTML
// is written from the same pieces.
interface Part {
  readonly calendar: string;
  readonly calendarUrl: string;
  readonly counts: string;
  readonly figures: readonly string[];
  readonly name: string;
  readonly planned: readonly string[];
  readonly plannedMore: Option.Option<string>;
  readonly wentOut: readonly string[];
  readonly wentOutMore: Option.Option<string>;
}

const countsOf = (
  catalog: EmailCatalog,
  locale: Locale,
  counts: DigestCounts
): string =>
  [
    pluralIn(locale, catalog.weeklyDigest.counts.wentOut, counts.wentOut),
    ...(counts.failed > 0
      ? [pluralIn(locale, catalog.weeklyDigest.counts.failed, counts.failed)]
      : []),
    ...(counts.unconfirmed > 0
      ? [
          pluralIn(
            locale,
            catalog.weeklyDigest.counts.unconfirmed,
            counts.unconfirmed
          ),
        ]
      : []),
    pluralIn(locale, catalog.weeklyDigest.counts.scheduled, counts.scheduled),
    ...(counts.awaitingApproval > 0
      ? [
          pluralIn(
            locale,
            catalog.weeklyDigest.counts.awaitingApproval,
            counts.awaitingApproval
          ),
        ]
      : []),
  ].join(" · ");

const figuresOf = (
  catalog: EmailCatalog,
  locale: Locale,
  engagement: Option.Option<DigestEngagement>
): readonly string[] =>
  Option.match(engagement, {
    onNone: () => [],
    onSome: (counted) => {
      const number = new Intl.NumberFormat(locale);

      return [
        fill(
          catalog.weeklyDigest.engagement,
          new Map([["engagement", number.format(counted.engagement)]]),
          keep
        ),
        ...Option.toArray(counted.impressions).map((impressions) =>
          fill(
            catalog.weeklyDigest.impressions,
            new Map([["impressions", number.format(impressions)]]),
            keep
          )
        ),
      ];
    },
  });

const postLine = (catalog: EmailCatalog, locale: Locale, post: DigestPost) =>
  `${instantIn(post.at, locale)}: ${
    post.excerpt === "" ? catalog.weeklyDigest.noText : post.excerpt
  }`;

const moreOf = (
  catalog: EmailCatalog,
  locale: Locale,
  counted: number,
  listed: number
): Option.Option<string> =>
  counted > listed
    ? Option.some(pluralIn(locale, catalog.weeklyDigest.more, counted - listed))
    : Option.none();

const partOf = (
  catalog: EmailCatalog,
  locale: Locale,
  workspace: LinkedDigestWorkspace
): Part => ({
  calendar: fill(
    catalog.weeklyDigest.calendar,
    new Map([["workspaceName", workspace.name]]),
    keep
  ),
  calendarUrl: workspace.calendarUrl,
  counts: countsOf(catalog, locale, workspace.counts),
  figures: figuresOf(catalog, locale, workspace.engagement),
  name: workspace.name,
  planned: workspace.planned.map((post) => postLine(catalog, locale, post)),
  plannedMore: moreOf(
    catalog,
    locale,
    workspace.counts.scheduled + workspace.counts.awaitingApproval,
    workspace.planned.length
  ),
  wentOut: workspace.wentOut.map((post) => postLine(catalog, locale, post)),
  wentOutMore: moreOf(
    catalog,
    locale,
    workspace.counts.wentOut,
    workspace.wentOut.length
  ),
});

const listHtml = (
  heading: string,
  lines: readonly string[],
  more: Option.Option<string>
): readonly string[] =>
  lines.length === 0
    ? []
    : [
        `<p style="margin:0 0 4px;font-weight:600;">${escapeHtml(heading)}</p>`,
        `<ul style="margin:0 0 12px;padding-left:20px;">${[
          ...lines,
          ...Option.toArray(more),
        ]
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</ul>`,
      ];

const partHtml = (catalog: EmailCatalog, part: Part): string =>
  [
    '<div style="margin:0 0 24px;padding:16px;border:1px solid #e7e5e4;border-radius:6px;">',
    `<p style="margin:0 0 8px;font-size:18px;font-weight:600;">${escapeHtml(part.name)}</p>`,
    `<p style="margin:0 0 12px;">${escapeHtml(part.counts)}</p>`,
    ...part.figures.map(
      (figure) =>
        `<p style="margin:0 0 12px;color:#52525b;font-size:14px;">${escapeHtml(figure)}</p>`
    ),
    ...listHtml(
      catalog.weeklyDigest.wentOutHeading,
      part.wentOut,
      part.wentOutMore
    ),
    ...listHtml(
      catalog.weeklyDigest.plannedHeading,
      part.planned,
      part.plannedMore
    ),
    `<p style="margin:0;font-size:14px;"><a href="${escapeHtml(part.calendarUrl)}" style="color:#18181b;">${escapeHtml(part.calendar)}</a></p>`,
    "</div>",
  ].join("\n");

const partText = (catalog: EmailCatalog, part: Part): string =>
  [
    part.name,
    part.counts,
    ...part.figures,
    ...(part.wentOut.length === 0
      ? []
      : [
          `${catalog.weeklyDigest.wentOutHeading}:`,
          ...[...part.wentOut, ...Option.toArray(part.wentOutMore)].map(
            (line) => `- ${line}`
          ),
        ]),
    ...(part.planned.length === 0
      ? []
      : [
          `${catalog.weeklyDigest.plannedHeading}:`,
          ...[...part.planned, ...Option.toArray(part.plannedMore)].map(
            (line) => `- ${line}`
          ),
        ]),
    `${part.calendar}: ${part.calendarUrl}`,
  ].join("\n");

/**
 * A person's weekly digest: for each workspace, its posts that went out,
 * failed or must be checked in the week, and those planned in the week
 * after, counted, the first named by the start of their text, with
 * engagement where the reader may read analytics. Days in UTC, as the
 * reader's time zone is not known; how to turn it off at its foot.
 */
export const renderWeeklyDigest = (email: DigestEmail): RenderedEmail => {
  const catalog = catalogs[email.locale];
  const words = catalog.weeklyDigest;

  const range = new Map([
    ["from", dayIn(email.week.from, email.locale)],
    ["to", dayIn(lastDayBefore(email.week.to), email.locale)],
    ["until", dayIn(lastDayBefore(email.week.until), email.locale)],
  ]);

  const parts = email.workspaces.map((workspace) =>
    partOf(catalog, email.locale, workspace)
  );

  const ignore = fill(
    words.ignore,
    new Map([
      ["preferences", `${words.preferences} (${email.preferencesUrl})`],
    ]),
    keep
  );

  return {
    html: digestLayout({
      action: escapeHtml(words.action),
      blocks: parts.map((part) => partHtml(catalog, part)),
      body: fill(words.intro, range, escapeHtml),
      ignore: fill(
        words.ignore,
        new Map([
          [
            "preferences",
            `<a href="${escapeHtml(email.preferencesUrl)}" style="color:#52525b;">${escapeHtml(words.preferences)}</a>`,
          ],
        ]),
        keep
      ),
      linkFallback: escapeHtml(catalog.layout.linkFallback),
      locale: email.locale,
      signature: escapeHtml(catalog.layout.signature),
      url: escapeHtml(email.agendaUrl),
    }),
    subject: fill(words.subject, range, keep),
    text: [
      fill(words.intro, range, keep),
      ...parts.map((part) => partText(catalog, part)),
      fill(
        catalog.layout.textLink,
        new Map([
          ["action", words.action],
          ["url", email.agendaUrl],
        ]),
        keep
      ),
      ignore,
      catalog.layout.signature,
    ].join("\n\n"),
  };
};
