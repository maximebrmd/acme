import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { optionsPlatforms, TargetOptionsSchema } from "peal-contract";
import type { ContentViolation, Platform } from "peal-contract";

import {
  channelOptionsOf,
  fieldOf,
  fieldsOf,
  initialValues,
  isShown,
  optionsOf,
  valuesOf,
  valuesOfPost,
  violationsByField,
  withValue,
} from "#posts/target-options.ts";

const channelId = "00000000-0000-7000-8000-000000000001";

describe("the options fields", () => {
  it("describe every platform that takes options, field by field", () => {
    for (const platform of optionsPlatforms) {
      const member = TargetOptionsSchema.members.find(
        ({ fields }) => fields.platform.literal === platform
      );

      const names = Object.keys(member?.fields ?? {});

      expect(fieldsOf(platform).length).toBeGreaterThan(0);

      for (const field of fieldsOf(platform)) {
        expect(names).toContain(field.name);
      }
    }

    expect(fieldsOf("mastodon")).toStrictEqual([]);
    expect(Option.isSome(fieldOf("youtube", "title"))).toBeTruthy();
    expect(Option.isNone(fieldOf("youtube", "privacyLevel"))).toBeTruthy();
  });

  it("start TikTok's interactions off and its disclosure untold", () => {
    expect(initialValues("tiktok")).toStrictEqual({
      aiGenerated: false,
      brandContent: false,
      brandOrganic: false,
      commercialContent: false,
      disableComment: true,
      disableDuet: true,
      disableStitch: true,
    });
    expect(initialValues("youtube")).toStrictEqual({
      containsSyntheticMedia: false,
      notifySubscribers: true,
    });
  });
});

describe(optionsOf, () => {
  it("leaves out what is not filled in, and splits tags at commas", () => {
    expect(
      optionsOf("youtube", {
        categoryId: "",
        madeForKids: false,
        tags: " launch, launch day ,, ",
        title: "",
      })
    ).toStrictEqual(
      Option.some({
        madeForKids: false,
        platform: "youtube",
        tags: ["launch", "launch day"],
      })
    );
    expect(optionsOf("youtube", { tags: " , " })).toStrictEqual(
      Option.some({ platform: "youtube" })
    );
  });

  it("gives nothing on a platform that takes no options", () => {
    expect(optionsOf("mastodon", { title: "Hi" })).toStrictEqual(Option.none());
  });

  it("fills the fields back from the options it gave", () => {
    const values = {
      ...initialValues("youtube"),
      madeForKids: true,
      privacy: "unlisted",
      tags: "launch, launch day",
      title: "A synthetic launch video",
    };

    expect(
      optionsOf("youtube", values).pipe(
        Option.map((options) => valuesOf("youtube", options))
      )
    ).toStrictEqual(Option.some(values));
    // A target without options starts as a new one.
    expect(valuesOf("tiktok", null)).toStrictEqual(initialValues("tiktok"));
  });
});

// The names of the Google Business Profile fields these values show.
const shownWith = (values: Readonly<Record<string, boolean | string>>) =>
  fieldsOf("googleBusiness")
    .filter((field) => isShown("googleBusiness", field, values))
    .map(({ name }) => name);

describe("a Google Business Profile post's options", () => {
  it("show an update's button, an event's title and dates, an offer's code and terms", () => {
    expect(shownWith({})).toStrictEqual(["postType", "callToAction"]);
    expect(shownWith({ callToAction: "book" })).toStrictEqual([
      "postType",
      "callToAction",
      "callToActionUrl",
    ]);
    // The call button rings the location: no address to give.
    expect(shownWith({ callToAction: "call" })).toStrictEqual([
      "postType",
      "callToAction",
    ]);
    expect(shownWith({ postType: "event" })).toStrictEqual([
      "postType",
      "title",
      "startsAt",
      "endsAt",
      "callToAction",
    ]);
    // An offer shows Google's own button, whatever was chosen before.
    expect(
      shownWith({ callToAction: "book", postType: "offer" })
    ).toStrictEqual([
      "postType",
      "title",
      "startsAt",
      "endsAt",
      "couponCode",
      "redeemUrl",
      "terms",
    ]);
  });

  it("send only what shows, so a changed post type leaves nothing behind", () => {
    const filled = {
      callToAction: "order",
      callToActionUrl: "https://example.com/order",
      couponCode: "SYNTHETIC-10",
      endsAt: "2026-11-27T18:00",
      startsAt: "2026-11-27T09:00",
      title: "Synthetic open day",
    };

    expect(
      Option.getOrThrow(optionsOf("googleBusiness", filled))
    ).toStrictEqual({
      callToAction: "order",
      callToActionUrl: "https://example.com/order",
      platform: "googleBusiness",
    });
    expect(
      Option.getOrThrow(
        optionsOf("googleBusiness", { ...filled, postType: "offer" })
      )
    ).toStrictEqual({
      couponCode: "SYNTHETIC-10",
      endsAt: "2026-11-27T18:00",
      platform: "googleBusiness",
      postType: "offer",
      startsAt: "2026-11-27T09:00",
      title: "Synthetic open day",
    });
  });

  it("fill the fields back from stored options, with nothing ticked at first", () => {
    expect(initialValues("googleBusiness")).toStrictEqual({});
    expect(
      valuesOf("googleBusiness", {
        endsAt: "2026-11-27T18:00",
        platform: "googleBusiness",
        postType: "event",
        startsAt: "2026-11-27T09:00",
        title: "Synthetic open day",
      })
    ).toStrictEqual({
      endsAt: "2026-11-27T18:00",
      postType: "event",
      startsAt: "2026-11-27T09:00",
      title: "Synthetic open day",
    });
  });
});

describe("Pinterest's fields", () => {
  it("give the board, a whole second for the cover, and nothing left empty", () => {
    expect(
      optionsOf("pinterest", {
        boardId: "549755885001",
        boardSectionId: "5000000000001",
        coverSecond: " 12 ",
        dominantColor: "",
        link: "https://peal.example/recipes",
        title: "Tomato salad",
      })
    ).toStrictEqual(
      Option.some({
        boardId: "549755885001",
        boardSectionId: "5000000000001",
        coverSecond: 12,
        link: "https://peal.example/recipes",
        platform: "pinterest",
        title: "Tomato salad",
      })
    );
    // Anything but digits is no second the API would take.
    expect(
      optionsOf("pinterest", { boardId: "549755885001", coverSecond: "1.5" })
    ).toStrictEqual(
      Option.some({ boardId: "549755885001", platform: "pinterest" })
    );
  });

  it("fill back from stored options, the second as its digits", () => {
    expect(
      valuesOf("pinterest", {
        boardId: "549755885001",
        coverSecond: 0,
        platform: "pinterest",
      })
    ).toStrictEqual({ boardId: "549755885001", coverSecond: "0" });
    expect(initialValues("pinterest")).toStrictEqual({});
  });

  it("forget the section when the board changes, and only then", () => {
    const values = {
      boardId: "549755885001",
      boardSectionId: "5000000000001",
      title: "Tomato salad",
    };

    expect(
      withValue("pinterest", values, "boardId", "549755885002")
    ).toStrictEqual({ boardId: "549755885002", title: "Tomato salad" });
    expect(
      withValue("pinterest", values, "boardId", "549755885001")
    ).toStrictEqual(values);
    expect(withValue("pinterest", values, "title", "Salad")).toStrictEqual({
      ...values,
      title: "Salad",
    });
  });
});

describe(valuesOfPost, () => {
  it("fills in the targets of platforms that take options", () => {
    const platforms = new Map<string, Platform>([
      ["c1", "youtube"],
      ["c2", "mastodon"],
    ]);

    const values = valuesOfPost(
      {
        authorId: null,
        content: { media: [], overrides: [], text: "A synthetic video" },
        id: "00000000-0000-7000-8000-000000000009",
        outcome: null,
        schedule: null,
        status: "draft",
        targets: ["c1", "c2", "gone"].map((id) => ({
          channelId: id,
          failureReason: null,
          id: `target-${id}`,
          options: id === "c1" ? { platform: "youtube", title: "Hi" } : null,
          permalink: null,
          publishedAt: null,
          round: 1,
          status: "pending",
          unconfirmedReason: null,
        })),
      },
      (id) => Option.fromUndefinedOr(platforms.get(id))
    );

    expect(values).toStrictEqual({
      c1: { ...initialValues("youtube"), title: "Hi" },
    });
  });
});

describe(withValue, () => {
  it("clears a box under another that is unticked", () => {
    const disclosed = withValue(
      "tiktok",
      {
        ...initialValues("tiktok"),
        brandContent: true,
        commercialContent: true,
      },
      "commercialContent",
      false
    );

    expect(disclosed).toMatchObject({
      brandContent: false,
      brandOrganic: false,
      commercialContent: false,
    });
    expect(
      withValue("youtube", { title: "Hi" }, "title", undefined)
    ).toStrictEqual({});
  });
});

describe(channelOptionsOf, () => {
  it("gives options on the channels whose platform takes some", () => {
    expect(
      channelOptionsOf(
        [
          { id: "c1", platform: "tiktok" },
          { id: "c2", platform: "bluesky" },
        ],
        {}
      )
    ).toStrictEqual([
      {
        channelId: "c1",
        options: {
          aiGenerated: false,
          brandContent: false,
          brandOrganic: false,
          commercialContent: false,
          disableComment: true,
          disableDuet: true,
          disableStitch: true,
          platform: "tiktok",
        },
      },
    ]);
  });
});

describe(violationsByField, () => {
  it("keeps the channel's option violations, by field", () => {
    const violations: readonly ContentViolation[] = [
      { _tag: "optionMissing", channelId, field: "title", platform: "youtube" },
      {
        _tag: "optionMissing",
        channelId: "another",
        field: "privacyLevel",
        platform: "tiktok",
      },
      { _tag: "empty", channelId, platform: "youtube" },
    ];

    expect([...violationsByField(violations, channelId).keys()]).toStrictEqual([
      "title",
    ]);
  });
});
