import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option, Result } from "effect";

import { parseFeedAddress } from "#publishing/domain/feed-address.ts";
import { FeedEntry } from "#publishing/domain/feed-entry.ts";
import { FeedIdSchema } from "#publishing/domain/feed-id.ts";
import { newItems } from "#publishing/domain/feed-items.ts";
import {
  defaultTemplate,
  maxTemplateLength,
  parseTemplate,
  writtenFrom,
} from "#publishing/domain/feed-template.ts";
import {
  feedCheckInterval,
  maxItemsPerDay,
  maxItemsPerRun,
  nextCheckAfter,
  pauseFeed,
  readFailed,
  readSucceeded,
  resumeFeed,
  startFeed,
} from "#publishing/domain/feed.ts";
import type { NewFeed } from "#publishing/domain/feed.ts";
import { ItemDigestSchema } from "#publishing/domain/item-digest.ts";
import type { ItemDigest } from "#publishing/domain/item-digest.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

const utc = (text: string) => DateTime.makeUnsafe(text);
const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

const digestOf = (n: number): ItemDigest =>
  ItemDigestSchema.make(n.toString(16).padStart(64, "0"));

const entry = (
  n: number,
  more: {
    readonly at?: string;
    readonly title?: string;
    readonly link?: string;
    readonly summary?: string;
  } = {}
) =>
  new FeedEntry({
    digest: digestOf(n),
    link: Option.fromUndefinedOr(more.link),
    pictureUrl: Option.none(),
    publishedAt: Option.fromUndefinedOr(more.at).pipe(Option.map(utc)),
    summary: Option.fromUndefinedOr(more.summary),
    title: Option.fromUndefinedOr(more.title),
  });

const feedId = FeedIdSchema.make("00000000-0000-7000-8000-000000000001");

const newFeed: NewFeed = {
  attachPicture: false,
  channelIds: [],
  channelSetId: Option.none(),
  id: feedId,
  mode: "draft",
  queueId: Option.none(),
  startedBy: Option.none(),
  startedVia: { _tag: "web" },
  template: defaultTemplate,
  title: Option.some("A blog"),
  url: Result.getOrThrow(parseFeedAddress("https://blog.example/feed.xml")),
  validators: { etag: Option.some('"v1"'), lastModified: Option.none() },
  workspaceId: WorkspaceIdSchema.make("2f6c8d3e-0f4a-4b7e-9c1d-5a6b7c8d9e0f"),
};

const start = utc("2026-06-15T07:00:00Z");

const reasonOf = (input: string) =>
  Result.match(parseFeedAddress(input), {
    onFailure: ({ reason }) => reason,
    onSuccess: () => "taken",
  });

describe("a feed's address", () => {
  it("takes HTTPS on the default port, without its fragment", () => {
    expect(
      Result.getOrThrow(parseFeedAddress(" https://blog.example/feed?x=1#top "))
    ).toBe("https://blog.example/feed?x=1");
  });

  it("refuses anything else", () => {
    expect(
      [
        "http://blog.example/feed",
        "https://blog.example:8443/feed",
        "file:///etc/passwd",
        "https://user:secret@blog.example/feed",
        "not an address",
        `https://blog.example/${"a".repeat(2100)}`,
      ].map(reasonOf)
    ).toStrictEqual([
      "notHttps",
      "notHttps",
      "notHttps",
      "credentials",
      "malformed",
      "malformed",
    ]);
  });
});

describe("a feed's template", () => {
  it("knows its placeholders and refuses any other", () => {
    expect(
      Result.isSuccess(parseTemplate("{title} {link} {summary}"))
    ).toBeTruthy();
    expect(
      Result.isSuccess(parseTemplate("Read this { or not }"))
    ).toBeTruthy();

    const refused = parseTemplate("{title} {author}");

    expect(Result.isFailure(refused)).toBeTruthy();
    expect(
      Result.match(refused, {
        onFailure: (failure) => [failure.reason, failure.placeholder],
        onSuccess: () => [],
      })
    ).toStrictEqual(["unknownPlaceholder", "author"]);
  });

  it("refuses an empty template, or a long one", () => {
    expect(Result.isFailure(parseTemplate(" \n "))).toBeTruthy();
    expect(
      Result.isFailure(parseTemplate("a".repeat(maxTemplateLength + 1)))
    ).toBeTruthy();
    expect(
      Result.isSuccess(parseTemplate("a".repeat(maxTemplateLength)))
    ).toBeTruthy();
  });

  it("writes the item's parts in, leaving no gap where one is missing", () => {
    expect(
      writtenFrom(
        defaultTemplate,
        entry(1, { link: "https://blog.example/a", title: "A post" })
      )
    ).toStrictEqual(Option.some("A post\n\nhttps://blog.example/a"));

    expect(
      writtenFrom(defaultTemplate, entry(1, { link: "https://blog.example/a" }))
    ).toStrictEqual(Option.some("https://blog.example/a"));

    expect(
      writtenFrom("{title}\n\n{summary}\n\n{link}", entry(1, { title: "T" }))
    ).toStrictEqual(Option.some("T"));
  });

  it("writes nothing from an item that gives nothing", () => {
    expect(writtenFrom(defaultTemplate, entry(1))).toStrictEqual(Option.none());
  });

  it("never reads a placeholder in what an item says", () => {
    expect(
      writtenFrom(
        "{title}",
        entry(1, { link: "https://x.example", title: "{link}" })
      )
    ).toStrictEqual(Option.some("{link}"));
  });
});

describe("a template's room", () => {
  it("is refused when its placeholders, filled to the most, would not fit a post", () => {
    const links = Array.from({ length: 40 }, () => "{link}").join("\n");

    expect(
      Result.match(parseTemplate(links), {
        onFailure: ({ reason }) => reason,
        onSuccess: () => "taken",
      })
    ).toBe("tooLong");
    expect(
      Result.isSuccess(parseTemplate("{title} {link} {summary}"))
    ).toBeTruthy();
  });

  it("writes nothing that would not fit a post", () => {
    const longLink = `https://blog.example/${"a".repeat(70_000)}`;

    expect(writtenFrom("{link}", entry(1, { link: longLink }))).toStrictEqual(
      Option.none()
    );
  });
});

describe("which items are new", () => {
  const since = utc("2026-06-15T00:00:00Z");

  it("leaves out those kept and those dated before the feed", () => {
    const { make, tooMany } = newItems(
      [
        entry(3, { at: "2026-06-15T09:00:00Z" }),
        entry(2, { at: "2026-06-15T08:00:00Z" }),
        entry(1, { at: "2026-06-14T08:00:00Z" }),
      ],
      new Set([digestOf(3)]),
      since,
      0
    );

    expect(make.map(({ digest }) => digest)).toStrictEqual([digestOf(2)]);
    expect(tooMany).toStrictEqual([]);
  });

  it("makes the oldest first: by date, or as the feed lists them reversed", () => {
    const dated = newItems(
      [
        entry(1, { at: "2026-06-15T08:00:00Z" }),
        entry(2, { at: "2026-06-15T10:00:00Z" }),
        entry(3, { at: "2026-06-15T09:00:00Z" }),
      ],
      new Set(),
      since,
      0
    );

    expect(dated.make.map(({ digest }) => digest)).toStrictEqual([
      digestOf(1),
      digestOf(3),
      digestOf(2),
    ]);

    const undated = newItems(
      [entry(1), entry(2), entry(1)],
      new Set(),
      since,
      0
    );

    expect(undated.make.map(({ digest }) => digest)).toStrictEqual([
      digestOf(2),
      digestOf(1),
    ]);
  });

  it("makes so many a run and a day, and the rest are too many", () => {
    const flood = Array.from({ length: 10 }, (_, n) => entry(n + 1));

    const first = newItems(flood, new Set(), since, 0);

    expect(first.make).toHaveLength(maxItemsPerRun);
    expect(first.tooMany).toHaveLength(10 - maxItemsPerRun);

    const late = newItems(flood, new Set(), since, maxItemsPerDay - 1);

    expect(late.make).toHaveLength(1);

    expect(newItems(flood, new Set(), since, maxItemsPerDay).make).toHaveLength(
      0
    );
  });
});

describe("a feed's checks", () => {
  it("are an interval apart, spread by the feed's id", () => {
    const feed = startFeed(newFeed, start);
    const next = DateTime.distance(start, feed.nextCheckAt);

    expect(
      Duration.isGreaterThanOrEqualTo(next, feedCheckInterval)
    ).toBeTruthy();
    expect(Duration.isLessThan(next, Duration.minutes(70))).toBeTruthy();
    expect(iso(nextCheckAfter(feedId, start))).toBe(iso(feed.nextCheckAt));
  });

  it("wait longer while a feed fails", () => {
    const once = readFailed(
      startFeed(newFeed, start),
      "serverError",
      Option.none(),
      start
    );

    const later = utc("2026-06-15T11:00:00Z");
    const longAfter = utc("2026-06-18T07:00:00Z");

    expect(
      [
        once.nextCheckAt,
        readFailed(once, "timeout", Option.none(), later).nextCheckAt,
        readFailed(once, "timeout", Option.none(), longAfter).nextCheckAt,
      ].map(iso)
    ).toStrictEqual([
      "2026-06-15T08:00:00.000Z",
      "2026-06-15T15:00:00.000Z",
      "2026-06-19T07:00:00.000Z",
    ]);
    expect(Option.getOrThrow(once.lastFailure)).toBe("serverError");
  });

  it("wait as long as the host asks", () => {
    const once = readFailed(
      startFeed(newFeed, start),
      "serverError",
      Option.none(),
      start
    );

    const asked = readFailed(
      once,
      "rateLimited",
      Option.some(Duration.minutes(30)),
      utc("2026-06-15T11:00:00Z")
    );

    expect(iso(asked.nextCheckAt)).toBe("2026-06-15T11:30:00.000Z");
  });

  it("are back to normal after a good read", () => {
    const once = readFailed(
      startFeed(newFeed, start),
      "serverError",
      Option.none(),
      start
    );

    const back = readSucceeded(
      once,
      utc("2026-06-15T11:00:00Z"),
      Option.none()
    );

    expect(Option.isNone(back.failingSince)).toBeTruthy();
    expect(Option.isNone(back.lastFailure)).toBeTruthy();
    expect(Option.getOrThrow(back.etag)).toBe('"v1"');
  });

  it("stop when the host says gone, or after seven days of failing", () => {
    const feed = startFeed(newFeed, start);

    expect(readFailed(feed, "gone", Option.none(), start).status).toMatchObject(
      {
        _tag: "stopped",
        reason: "gone",
      }
    );

    const failing = readFailed(feed, "notAFeed", Option.none(), start);

    const sixDays = readFailed(
      failing,
      "notAFeed",
      Option.none(),
      utc("2026-06-21T07:00:00Z")
    );

    expect(sixDays.status._tag).toBe("active");

    expect(
      readFailed(
        sixDays,
        "notAFeed",
        Option.none(),
        utc("2026-06-22T07:00:00Z")
      ).status
    ).toMatchObject({ _tag: "stopped", reason: "notAFeed" });

    expect(
      readFailed(sixDays, "timeout", Option.none(), utc("2026-06-22T07:00:00Z"))
        .status
    ).toMatchObject({ _tag: "stopped", reason: "unreachable" });
  });

  it("start over from now when resumed", () => {
    const paused = pauseFeed(startFeed(newFeed, start), start);
    const now = utc("2026-06-20T07:00:00Z");

    const resumed = resumeFeed(paused, now, {
      title: Option.none(),
      validators: { etag: Option.none(), lastModified: Option.some("x") },
    });

    expect(resumed.status._tag).toBe("active");
    expect(iso(resumed.since)).toBe(iso(now));
    expect(Option.getOrThrow(resumed.title)).toBe("A blog");
  });
});
