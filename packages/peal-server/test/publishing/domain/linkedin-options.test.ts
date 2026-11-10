import { describe, expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";

import { mentionSpans } from "#publishing/domain/linkedin-mentions.ts";
import {
  LinkedInOptions,
  maxLinkedInDocumentTitleLength,
  maxLinkedInMentions,
} from "#publishing/domain/linkedin-options.ts";
import {
  describeOptionsOn,
  optionProblemsOn,
  takesOptions,
} from "#publishing/domain/target-options.ts";

const bakery = {
  name: "Example Bakery",
  urn: "urn:li:organization:9000000001",
};

const bikes = { name: "Example", urn: "urn:li:organization:9000000002" };

const decode = Schema.decodeUnknownOption(LinkedInOptions);

const problemsOf = (fields: Omit<typeof LinkedInOptions.Encoded, "platform">) =>
  decode({ ...fields, platform: "linkedin" }).pipe(
    Option.map((options) => options.problems())
  );

describe("LinkedIn's options", () => {
  it("need nothing: a post without any goes out public", () => {
    expect(takesOptions("linkedin")).toBeTruthy();
    expect(optionProblemsOn("linkedin", Option.none())).toStrictEqual([]);
    expect(problemsOf({})).toStrictEqual(Option.some([]));
  });

  it("describe every field to clients", () => {
    expect(
      describeOptionsOn("linkedin").map((field) =>
        "_tag" in field ? field : [field.name, field.type, field.required]
      )
    ).toStrictEqual([
      ["disableReshare", "boolean", false],
      ["documentTitle", "text", false],
      ["linkDescription", "text", false],
      ["linkTitle", "text", false],
      ["linkUrl", "text", false],
      ["mentions", "mentionList", false],
      ["visibility", "choice", false],
    ]);
  });

  it("refuse a link without a title, and a title without its link", () => {
    expect(
      problemsOf({ linkUrl: "https://example.test/launch" })
    ).toStrictEqual(Option.some([{ _tag: "missing", field: "linkTitle" }]));
    expect(problemsOf({ linkTitle: "Launch day" })).toStrictEqual(
      Option.some([{ _tag: "missing", field: "linkUrl" }])
    );
    expect(
      problemsOf({
        linkDescription: "What ships",
        linkTitle: "Launch day",
        linkUrl: "https://example.test/launch",
      })
    ).toStrictEqual(Option.some([]));
  });

  it("refuse a link that is not an HTTPS or HTTP address", () => {
    for (const linkUrl of ["example.test", "ftp://example.test/a", "//x"]) {
      expect(problemsOf({ linkTitle: "Launch", linkUrl })).toStrictEqual(
        Option.some([{ _tag: "invalid", field: "linkUrl" }])
      );
    }
  });

  it("refuse a document title longer than Peal takes, or blank", () => {
    expect(
      problemsOf({
        documentTitle: "a".repeat(maxLinkedInDocumentTitleLength + 1),
      })
    ).toStrictEqual(
      Option.some([
        {
          _tag: "tooLong",
          field: "documentTitle",
          length: maxLinkedInDocumentTitleLength + 1,
          maximum: maxLinkedInDocumentTitleLength,
        },
      ])
    );
    expect(problemsOf({ documentTitle: "  " })).toStrictEqual(
      Option.some([{ _tag: "invalid", field: "documentTitle" }])
    );
  });

  it("take mentions of pages only, each named once", () => {
    expect(problemsOf({ mentions: [bakery, bikes] })).toStrictEqual(
      Option.some([])
    );

    for (const mentions of [
      [{ name: "Alice Example", urn: "urn:li:person:aB3dE5fG7h" }],
      [{ name: " ", urn: bakery.urn }],
      [{ name: "Two\nlines", urn: bakery.urn }],
      [bakery, { ...bakery, urn: bikes.urn }],
    ]) {
      expect(problemsOf({ mentions })).toStrictEqual(
        Option.some([{ _tag: "invalid", field: "mentions" }])
      );
    }

    // More than a post holds is not options at all.
    expect(
      decode({
        mentions: Array.from({ length: maxLinkedInMentions + 1 }, () => bakery),
        platform: "linkedin",
      })
    ).toStrictEqual(Option.none());
  });
});

describe("mentions in a post's text", () => {
  it("are found where the text names them after an @", () => {
    expect(
      mentionSpans("Thanks @Example Bakery and @Example!", [bikes, bakery])
    ).toStrictEqual([
      { end: 22, mention: bakery, start: 7 },
      { end: 35, mention: bikes, start: 27 },
    ]);
  });

  it("leave a longer word, an address and a name without @ alone", () => {
    expect(
      mentionSpans("@Examples, hi@Example, Example Bakery, @example", [
        bikes,
        bakery,
      ])
    ).toStrictEqual([]);
  });

  it("find a name each time the text holds it", () => {
    expect(
      mentionSpans("@Example @Example", [bikes]).map(({ start }) => start)
    ).toStrictEqual([0, 9]);
  });
});
