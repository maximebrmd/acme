import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  GoogleBusinessOptions,
  googleBusinessLocalTimeOf,
  googleBusinessLocalTimePattern,
  isGoogleBusinessLink,
  maxGoogleBusinessTitleLength,
} from "#publishing/domain/google-business-options.ts";
import {
  describeOptionsOn,
  optionConstraintsOn,
  optionProblemsOn,
} from "#publishing/domain/target-options.ts";

const event = {
  endsAt: "2026-11-27T18:00",
  postType: "event",
  startsAt: "2026-11-27T09:00",
  title: "Synthetic open day",
} as const;

const problemsOf = (
  fields: ConstructorParameters<typeof GoogleBusinessOptions>[0]
) => new GoogleBusinessOptions(fields).problems();

describe(GoogleBusinessOptions, () => {
  it("takes a standard post with nothing chosen, as a target without options", () => {
    expect(problemsOf({})).toStrictEqual([]);
    expect(optionProblemsOn("googleBusiness", Option.none())).toStrictEqual([]);
    expect(problemsOf({ postType: "standard" })).toStrictEqual([]);
  });

  it("needs a title and both dates for an event and for an offer", () => {
    for (const postType of ["event", "offer"] as const) {
      expect(problemsOf({ postType })).toStrictEqual([
        { _tag: "missing", field: "title" },
        { _tag: "missing", field: "startsAt" },
        { _tag: "missing", field: "endsAt" },
      ]);
      expect(problemsOf({ ...event, postType })).toStrictEqual([]);
    }

    expect(problemsOf({ ...event, title: "  " })).toStrictEqual([
      { _tag: "missing", field: "title" },
    ]);
  });

  it("holds a title to 58 characters, counted in code points", () => {
    const longest = "👍".repeat(maxGoogleBusinessTitleLength);

    expect(problemsOf({ ...event, title: longest })).toStrictEqual([]);
    expect(problemsOf({ ...event, title: `${longest}a` })).toStrictEqual([
      { _tag: "tooLong", field: "title", length: 59, maximum: 58 },
    ]);
  });

  it("refuses dates that are not real, or an end that is not after the start", () => {
    expect(
      problemsOf({ ...event, startsAt: "2026-02-30T09:00" })
    ).toStrictEqual([{ _tag: "invalid", field: "startsAt" }]);
    expect(problemsOf({ ...event, endsAt: "2026-11-27T24:00" })).toStrictEqual([
      { _tag: "invalid", field: "endsAt" },
    ]);
    expect(
      problemsOf({ ...event, startsAt: "2026-11-27 09:00" })
    ).toStrictEqual([{ _tag: "invalid", field: "startsAt" }]);
    expect(problemsOf({ ...event, endsAt: event.startsAt })).toStrictEqual([
      { _tag: "invalid", field: "endsAt" },
    ]);
    expect(problemsOf({ ...event, endsAt: "2026-11-26T23:59" })).toStrictEqual([
      { _tag: "invalid", field: "endsAt" },
    ]);
  });

  it("reads a day and a time as Google takes them", () => {
    expect(googleBusinessLocalTimeOf("2028-02-29T07:05")).toStrictEqual({
      day: 29,
      hours: 7,
      minutes: 5,
      month: 2,
      year: 2028,
    });
    expect(googleBusinessLocalTimeOf("2027-02-29T07:05")).toBeUndefined();
    expect(googleBusinessLocalTimeOf("2026-13-01T00:00")).toBeUndefined();
    expect(googleBusinessLocalTimeOf("2026-11-27T09:60")).toBeUndefined();
    expect(googleBusinessLocalTimeOf("2026-11-27T09:00Z")).toBeUndefined();
  });

  it("keeps an event's title and dates off a standard post", () => {
    expect(
      problemsOf({ endsAt: event.endsAt, title: event.title })
    ).toStrictEqual([
      { _tag: "invalid", field: "title" },
      { _tag: "invalid", field: "endsAt" },
    ]);
  });

  it("needs an address for every button but the call, which takes none", () => {
    for (const callToAction of [
      "book",
      "order",
      "shop",
      "learnMore",
      "signUp",
    ] as const) {
      expect(problemsOf({ callToAction })).toStrictEqual([
        { _tag: "missing", field: "callToActionUrl" },
      ]);
      expect(
        problemsOf({
          callToAction,
          callToActionUrl: "https://example.com/book?table=2",
        })
      ).toStrictEqual([]);
    }

    expect(problemsOf({ callToAction: "call" })).toStrictEqual([]);
    expect(
      problemsOf({
        callToAction: "call",
        callToActionUrl: "https://example.com",
      })
    ).toStrictEqual([{ _tag: "invalid", field: "callToActionUrl" }]);
    expect(
      problemsOf({ callToActionUrl: "https://example.com" })
    ).toStrictEqual([{ _tag: "invalid", field: "callToActionUrl" }]);
  });

  it("takes only http and https addresses", () => {
    expect(isGoogleBusinessLink("https://example.com/menu")).toBeTruthy();
    expect(isGoogleBusinessLink("http://example.com")).toBeTruthy();

    for (const address of [
      "example.com",
      "tel:+33100000000",
      "ftp://example.com/menu",
      "https://",
      "",
    ]) {
      expect(isGoogleBusinessLink(address)).toBeFalsy();
    }

    expect(
      problemsOf({ callToAction: "order", callToActionUrl: "example.com" })
    ).toStrictEqual([{ _tag: "invalid", field: "callToActionUrl" }]);
    expect(
      problemsOf({ ...event, postType: "offer", redeemUrl: "example.com" })
    ).toStrictEqual([{ _tag: "invalid", field: "redeemUrl" }]);
  });

  it("gives an offer its code, address and terms, and no button of its own", () => {
    expect(
      problemsOf({
        ...event,
        couponCode: "SYNTHETIC-10",
        postType: "offer",
        redeemUrl: "https://example.com/redeem",
        terms: "One per synthetic customer.",
      })
    ).toStrictEqual([]);

    expect(
      problemsOf({
        ...event,
        callToAction: "shop",
        callToActionUrl: "https://example.com",
        postType: "offer",
      })
    ).toStrictEqual([{ _tag: "invalid", field: "callToAction" }]);

    expect(
      problemsOf({
        ...event,
        couponCode: "SYNTHETIC-10",
        redeemUrl: "https://example.com/redeem",
        terms: "One per synthetic customer.",
      })
    ).toStrictEqual([
      { _tag: "invalid", field: "couponCode" },
      { _tag: "invalid", field: "redeemUrl" },
      { _tag: "invalid", field: "terms" },
    ]);
  });

  it("describes its fields from the constants its rules use", () => {
    const fields = new Map(
      describeOptionsOn("googleBusiness").map((field) => [field.name, field])
    );

    expect([...fields.keys()]).toStrictEqual([
      "callToAction",
      "callToActionUrl",
      "couponCode",
      "endsAt",
      "postType",
      "redeemUrl",
      "startsAt",
      "terms",
      "title",
    ]);
    expect(fields.get("postType")).toStrictEqual({
      ifLeftOut: "standard",
      name: "postType",
      required: false,
      type: "choice",
      values: ["standard", "event", "offer"],
    });
    expect(fields.get("callToAction")).toMatchObject({
      type: "choice",
      values: ["book", "order", "shop", "learnMore", "signUp", "call"],
    });
    expect(fields.get("title")).toMatchObject({
      maxLength: maxGoogleBusinessTitleLength,
      required: false,
      type: "text",
    });
    expect(fields.get("startsAt")).toMatchObject({
      pattern: googleBusinessLocalTimePattern.source,
      type: "text",
    });
  });

  it("lists the rules between its options, each one a problem when broken", () => {
    const constraints = optionConstraintsOn("googleBusiness");

    expect(constraints).toContainEqual({
      _tag: "neededWith",
      field: "title",
      other: "postType",
      values: ["event", "offer"],
    });
    expect(constraints).toContainEqual({
      _tag: "onlyWith",
      field: "callToAction",
      other: "postType",
      values: ["standard", "event"],
    });
    expect(constraints).toContainEqual({
      _tag: "neededWith",
      field: "callToActionUrl",
      other: "callToAction",
      values: ["book", "order", "shop", "learnMore", "signUp"],
    });
    expect(constraints).toContainEqual({
      _tag: "onlyWith",
      field: "couponCode",
      other: "postType",
      values: ["offer"],
    });
    expect(constraints).toHaveLength(12);
  });
});
