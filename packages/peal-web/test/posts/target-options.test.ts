import { describe, expect, it } from "@effect/vitest";
import { optionsPlatforms, TargetOptionsSchema } from "peal-contract";
import type { ContentViolation, Platform } from "peal-contract";
import { Option } from "effect";

import {
  channelOptionsOf,
  fieldOf,
  fieldsOf,
  initialValues,
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
