import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { rfc822Date } from "#publishing/infrastructure/feeds/feed-dates.ts";
import { readFeed } from "#publishing/infrastructure/feeds/read-feed.ts";
import type { ReadFeed } from "#publishing/infrastructure/feeds/read-feed.ts";
import {
  maxXmlDepth,
  parseXml,
} from "#publishing/infrastructure/feeds/xml-tree.ts";

// Each format's mapping, on fixture documents: what an item says of
// itself, made storable, its addresses absolute against the feed's.

const fixture = (name: string) =>
  readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf-8");

const read = (text: string, base = "https://blog.example/feed.xml"): ReadFeed =>
  Option.getOrThrow(readFeed(text, base));

const iso = (at: Option.Option<DateTime.Utc>) =>
  Option.getOrUndefined(at.pipe(Option.map(DateTime.formatIso)));

const deep = (depth: number) => `${"<a>".repeat(depth)}${"</a>".repeat(depth)}`;

const shown = (feed: ReadFeed) =>
  feed.items.map((item) => ({
    identity: item.identity.replace("\u0000", ":"),
    link: Option.getOrUndefined(item.link),
    picture: Option.getOrUndefined(item.pictureUrl),
    publishedAt: iso(item.publishedAt),
    summary: Option.getOrUndefined(item.summary),
    title: Option.getOrUndefined(item.title),
  }));

describe("an RSS 2.0 feed", () => {
  const feed = read(fixture("rss.xml"));

  it("gives its title and every item that has something to say", () => {
    expect(Option.getOrThrow(feed.title)).toBe("A synthetic blog");
    expect(feed.items).toHaveLength(5);
  });

  it("names an item by its guid, else its link, else its title and date", () => {
    expect(shown(feed).map(({ identity }) => identity)).toStrictEqual([
      "guid:synthetic-3",
      "guid:https://blog.example/posts/second",
      "link:https://blog.example/posts/first",
      "description:No title, no link, no guid.",
      "link:javascript:alert(1)",
    ]);
  });

  it("reads each item's parts, made absolute and plain", () => {
    expect(shown(feed).slice(0, 3)).toStrictEqual([
      {
        identity: "guid:synthetic-3",
        link: "https://blog.example/posts/third",
        picture: "https://cdn.blog.example/third.jpg",
        publishedAt: "2026-06-15T07:30:00.000Z",
        summary: "The third post.\n\nSecond paragraph.",
        title: "Third post & more",
      },
      {
        identity: "guid:https://blog.example/posts/second",
        link: "https://blog.example/posts/second",
        picture: "https://blog.example/thumbs/second.png",
        publishedAt: "2026-06-14T08:00:00.000Z",
        summary: "Only a description, escaped.",
        title: "Second post",
      },
      {
        identity: "link:https://blog.example/posts/first",
        link: "https://blog.example/posts/first",
        picture: undefined,
        publishedAt: "2026-06-13T11:00:00.000Z",
        summary: undefined,
        title: "First post",
      },
    ]);
  });

  it("keeps no address but HTTP and HTTPS, and no date it cannot read", () => {
    const [unsafe] = shown(feed).slice(4);

    expect(unsafe?.link).toBeUndefined();
    expect(unsafe?.publishedAt).toBeUndefined();
  });
});

// The link an RSS item with this guid and no link gives.
const linkOfGuid = (guid: string) =>
  Option.getOrUndefined(
    Option.getOrThrow(
      readFeed(
        `<rss><channel><item><guid>${guid}</guid><title>T</title></item></channel></rss>`,
        "https://blog.example/feed.xml"
      )
    ).items[0]?.link ?? Option.none()
  );

describe("an RSS guid", () => {
  it("is an item's link only when it is an absolute address", () => {
    expect([
      linkOfGuid("1"),
      linkOfGuid("posts/1"),
      linkOfGuid("https://blog.example/a"),
    ]).toStrictEqual([undefined, undefined, "https://blog.example/a"]);
  });
});

describe("an Atom feed", () => {
  const feed = read(fixture("atom.xml"), "https://journal.example/atom");

  it("reads its title as text, whatever its type", () => {
    expect(Option.getOrThrow(feed.title)).toBe("A synthetic journal");
  });

  it("reads each entry's id, alternate link, date, summary and picture", () => {
    expect(shown(feed)).toStrictEqual([
      {
        identity: "id:urn:uuid:7a2b1c3d-0000-4000-8000-000000000002",
        link: "https://journal.example/entries/2",
        picture: "https://journal.example/2.png",
        publishedAt: "2026-06-15T07:00:00.000Z",
        summary: "Plain <text> summary",
        title: "Entry with a summary",
      },
      {
        identity: "id:urn:uuid:7a2b1c3d-0000-4000-8000-000000000003",
        link: "https://journal.example/entries/3",
        picture: "https://journal.example/3-thumb.jpg",
        publishedAt: "2026-06-14T09:00:00.000Z",
        summary: "Some bold text",
        title: "Entry with xhtml content",
      },
    ]);
  });
});

describe("a JSON Feed", () => {
  const feed = read(fixture("feed.json"), "https://notes.example/feed.json");

  it("reads each item's id, link, text, date and image", () => {
    expect(shown(feed)).toStrictEqual([
      {
        identity: "id:note-2",
        link: "https://notes.example/2",
        picture: "https://notes.example/images/2.webp",
        publishedAt: "2026-06-15T09:00:00.000Z",
        summary: "HTML content",
        title: "Bad title � here",
      },
      {
        identity: "id:1",
        link: undefined,
        picture: undefined,
        publishedAt: "2026-06-14T16:00:00.000Z",
        summary: "Its summary",
        title: undefined,
      },
      {
        identity: "id:note-0",
        link: undefined,
        picture: undefined,
        publishedAt: undefined,
        summary: "A title of the wrong type",
        title: undefined,
      },
    ]);
  });

  it("keeps no NUL, no half of a surrogate pair and no reordering mark", () => {
    const title = Option.getOrThrow(feed.title);

    expect(title).toBe("A synthetic feed");
    expect(
      feed.items.every(({ title: line }) =>
        Option.getOrElse(line, () => "").isWellFormed()
      )
    ).toBeTruthy();
  });

  it("is told from its content, and a JSON body that is not one is not", () => {
    expect(
      readFeed('{"version":"1","items":[]}', "https://x.example/")
    ).toStrictEqual(Option.none());
    expect(readFeed("[1, 2]", "https://x.example/")).toStrictEqual(
      Option.none()
    );
    expect(readFeed("{ not json", "https://x.example/")).toStrictEqual(
      Option.none()
    );
  });
});

describe("what is not a feed", () => {
  it("is anything but RSS's or Atom's root", () => {
    expect(
      readFeed("<html><body>Hello</body></html>", "https://x.example/")
    ).toStrictEqual(Option.none());
    expect(
      readFeed('<feed xmlns="urn:other"><entry/></feed>', "https://x.example/")
    ).toStrictEqual(Option.none());
    expect(readFeed("plain text", "https://x.example/")).toStrictEqual(
      Option.none()
    );
  });
});

describe("the XML parser", () => {
  it("never expands an entity a DOCTYPE declares", () => {
    const declared = `<?xml version="1.0"?>
<!DOCTYPE rss [<!ENTITY secret "expanded">]>
<rss><channel><title>&secret;</title></channel></rss>`;

    expect(parseXml(declared)).toStrictEqual(Option.none());
  });

  it("never expands nested entities, however many a DOCTYPE declares", () => {
    const laughs = Array.from(
      { length: 10 },
      (_, n) => `<!ENTITY lol${n + 1} "${`&lol${n};`.repeat(10)}">`
    ).join("");

    const bomb = `<?xml version="1.0"?>
<!DOCTYPE rss [<!ENTITY lol0 "lol">${laughs}]>
<rss><channel><title>&lol10;</title></channel></rss>`;

    const started = performance.now();

    expect(parseXml(bomb)).toStrictEqual(Option.none());
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("never reads an external entity", () => {
    const external = `<?xml version="1.0"?>
<!DOCTYPE rss [<!ENTITY file SYSTEM "file:///etc/passwd"><!ENTITY web SYSTEM "http://127.0.0.1/secret">]>
<rss><channel><title>&file;&web;</title></channel></rss>`;

    expect(parseXml(external)).toStrictEqual(Option.none());
  });

  it("reads a DOCTYPE that declares nothing it uses, and XML's own entities", () => {
    const root = parseXml(
      `<!DOCTYPE rss [<!ENTITY unused "x">]><rss><t>&lt;&amp;&#233;&#x1F44D;</t></rss>`
    );

    expect(root.pipe(Option.map(({ allText }) => allText))).toStrictEqual(
      Option.some("<&é👍")
    );
  });

  it("refuses a document deeper than it reads, without recursing", () => {
    expect(Option.isSome(parseXml(deep(maxXmlDepth)))).toBeTruthy();
    expect(parseXml(deep(maxXmlDepth + 1))).toStrictEqual(Option.none());
    expect(parseXml(deep(100_000))).toStrictEqual(Option.none());
  });

  it("refuses what is not well formed", () => {
    expect(parseXml("<rss><channel></rss>")).toStrictEqual(Option.none());
    expect(parseXml("<rss>&nope;</rss>")).toStrictEqual(Option.none());
  });
});

describe("RSS's dates", () => {
  it("read RFC 822 with a two or four digit year, a zone by name or offset", () => {
    expect(
      [
        "Sat, 07 Sep 2002 00:00:01 GMT",
        "07 Sep 02 00:00 +0130",
        "Tue, 10 Jun 03 04:00:00 PDT",
        "Fri, 31 Dec 99 23:59:59 -0000",
      ].map((text) => iso(rfc822Date(text)))
    ).toStrictEqual([
      "2002-09-07T00:00:01.000Z",
      "2002-09-06T22:30:00.000Z",
      "2003-06-10T11:00:00.000Z",
      "1999-12-31T23:59:59.000Z",
    ]);
  });

  it("read the zone names European feeds write", () => {
    expect(
      [
        "Mon, 15 Jun 2026 09:00:00 CEST",
        "Mon, 15 Dec 2026 09:00:00 CET",
        "Mon, 15 Jun 2026 09:00:00 BST",
        "Mon, 15 Jun 2026 09:00:00 EEST",
        "Mon, 15 Dec 2026 09:00:00 EET",
        "Mon, 15 Jun 2026 09:00:00 WEST",
        "Mon, 15 Dec 2026 09:00:00 WET",
      ].map((text) => iso(rfc822Date(text)))
    ).toStrictEqual([
      "2026-06-15T07:00:00.000Z",
      "2026-12-15T08:00:00.000Z",
      "2026-06-15T08:00:00.000Z",
      "2026-06-15T06:00:00.000Z",
      "2026-12-15T07:00:00.000Z",
      "2026-06-15T08:00:00.000Z",
      "2026-12-15T09:00:00.000Z",
    ]);
  });

  it("read nothing else", () => {
    expect(
      [
        "31 Feb 2026 10:00 GMT",
        "Mon, 15 Jun 2026 25:00 GMT",
        "2026-06-15",
        "15 Foo 2026 10:00 GMT",
        "15 Jun 2026 10:00 Q",
      ].map((text) => iso(rfc822Date(text)))
    ).toStrictEqual([undefined, undefined, undefined, undefined, undefined]);
  });
});

describe("a hostile document", () => {
  it("is read fast when a title or a summary is a 2 MiB run of '<'", () => {
    const run = "<".repeat(2 * 1024 * 1024);

    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title type="html"><![CDATA[${run}]]></title><entry><id>1</id><title type="html"><![CDATA[${run}]]></title><summary type="html"><![CDATA[${run}]]></summary></entry></feed>`;

    const rss = `<rss><channel><item><guid>1</guid><title><![CDATA[${run}]]></title><description><![CDATA[${run}]]></description></item></channel></rss>`;

    const started = performance.now();

    readFeed(atom, "https://x.example/");
    readFeed(rss, "https://x.example/");

    expect(performance.now() - started).toBeLessThan(1000);
  });
});
