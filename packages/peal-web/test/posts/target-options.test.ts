import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";
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

    expect(fieldsOf("facebook")).toStrictEqual([]);
    expect(Option.isSome(fieldOf("youtube", "title"))).toBeTruthy();
    expect(Option.isNone(fieldOf("youtube", "privacyLevel"))).toBeTruthy();
  });

  it("list each choice once, the one that chooses nothing included", () => {
    const repeated = optionsPlatforms.flatMap((platform) =>
      fieldsOf(platform).flatMap((field) => {
        if (field.kind !== "choice") {
          return [];
        }

        const labels = [
          ...(field.none === undefined ? [] : [field.none]),
          ...field.choices.map(({ label }) => label),
        ];

        return labels.length === new Set(labels).size
          ? []
          : [`${platform}.${field.name}`];
      })
    );

    expect(repeated).toStrictEqual([]);
  });

  it("have a field for every option the contract takes, and no other", () => {
    for (const platform of optionsPlatforms) {
      const member = TargetOptionsSchema.members.find(
        ({ fields }) => fields.platform.literal === platform
      );

      expect(
        fieldsOf(platform)
          .map(({ name }) => name)
          .toSorted()
      ).toStrictEqual(
        Object.keys(member?.fields ?? {})
          .filter((name) => name !== "platform")
          .toSorted()
      );
    }
  });

  it.each([
    [
      "linkedin",
      {
        disableReshare: true,
        documentTitle: "A synthetic deck",
        linkDescription: "What ships",
        linkTitle: "Launch day",
        linkUrl: "https://example.test/launch",
        mentions: "Example Bakery <urn:li:organization:9000000001>",
        visibility: "loggedIn",
      },
    ],
    [
      "tiktok",
      { ...initialValues("tiktok"), privacyLevel: "PUBLIC_TO_EVERYONE" },
    ],
    [
      "youtube",
      {
        ...initialValues("youtube"),
        categoryId: "22",
        madeForKids: false,
        privacy: "unlisted",
        tags: "launch, launch day",
        title: "A synthetic launch video",
      },
    ],
    [
      "pinterest",
      {
        boardId: "549755885001",
        boardSectionId: "5000000000001",
        coverSecond: "12",
        dominantColor: "#6E7874",
        link: "https://example.test/recipes",
        title: "Tomato salad",
      },
    ],
    [
      "googleBusiness",
      {
        couponCode: "SYNTHETIC-10",
        endsAt: "2026-11-27T18:00",
        postType: "offer",
        redeemUrl: "https://example.test/redeem",
        startsAt: "2026-11-27T09:00",
        terms: "One per synthetic customer.",
        title: "Synthetic open day",
      },
    ],
    [
      "mastodon",
      {
        contentWarning: "Spoilers for the synthetic finale",
        language: "fr",
        quotePolicy: "followers",
        sensitive: true,
        visibility: "unlisted",
      },
    ],
    [
      "bluesky",
      {
        contentLabel: "graphic-media",
        disableQuotes: true,
        languages: "en, pt-BR",
        replies: "limited",
        replyFollowers: true,
        replyFollowing: false,
        replyMentioned: true,
      },
    ],
    [
      "threads",
      {
        linkAttachment: "https://example.test/launch",
        replyControl: "mentioned_only",
        topicTag: "Synthetic launches",
      },
    ],
    [
      "x",
      {
        communityId: "1700000000000000001",
        madeWithAi: true,
        paidPartnership: true,
        replySettings: "following",
        shareWithFollowers: true,
      },
    ],
  ] as const)(
    "turn %s's fields, each kind filled in, into options the contract takes, and back",
    (platform, values) => {
      const options = Result.getOrThrow(optionsOf(platform, values));

      expect(options.pipe(Option.map((given) => given.platform))).toStrictEqual(
        Option.some(platform)
      );
      // Every field kept its value: nothing was dropped on the way.
      expect(
        options.pipe(Option.map((given) => Object.keys(given).toSorted()))
      ).toStrictEqual(
        Option.some([...Object.keys(values), "platform"].toSorted())
      );
      expect(
        options.pipe(Option.map((given) => valuesOf(platform, given)))
      ).toStrictEqual(Option.some(values));
    }
  );

  it("cover every platform that takes options in the test above", () => {
    expect([...optionsPlatforms].toSorted()).toStrictEqual([
      "bluesky",
      "googleBusiness",
      "linkedin",
      "mastodon",
      "pinterest",
      "threads",
      "tiktok",
      "x",
      "youtube",
    ]);
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
      Result.succeed(
        Option.some({
          madeForKids: false,
          platform: "youtube",
          tags: ["launch", "launch day"],
        })
      )
    );
    expect(optionsOf("youtube", { tags: " , " })).toStrictEqual(
      Result.succeed(Option.some({ platform: "youtube" }))
    );
  });

  it("gives nothing on a platform that takes no options", () => {
    expect(optionsOf("instagram", { title: "Hi" })).toStrictEqual(
      Result.succeed(Option.none())
    );
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
      Result.getOrThrow(optionsOf("youtube", values)).pipe(
        Option.map((options) => valuesOf("youtube", options))
      )
    ).toStrictEqual(Option.some(values));
    // A target without options starts as a new one.
    expect(valuesOf("tiktok", null)).toStrictEqual(initialValues("tiktok"));
  });
});

// The names of the fields of the platform these values show.
const shownOn =
  (platform: Platform) =>
  (values: Readonly<Record<string, boolean | string>>) =>
    fieldsOf(platform)
      .filter((field) => isShown(platform, field, values))
      .map(({ name }) => name);

describe("an X post's options", () => {
  it("offer to share with followers once a community is written, and send it only then", () => {
    const shown = shownOn("x");

    expect(shown(initialValues("x"))).not.toContain("shareWithFollowers");
    expect(shown({ communityId: "1700000000000000001" })).toContain(
      "shareWithFollowers"
    );
    expect(
      optionsOf("x", { ...initialValues("x"), shareWithFollowers: true })
    ).toStrictEqual(
      Result.succeed(
        Option.some({
          madeWithAi: false,
          paidPartnership: false,
          platform: "x",
        })
      )
    );
  });
});

describe("a Mastodon post's options", () => {
  it("offer a quote policy only on a post others may see", () => {
    const shown = shownOn("mastodon");

    expect(shown({})).toContain("quotePolicy");
    expect(shown({ visibility: "unlisted" })).toContain("quotePolicy");
    expect(shown({ visibility: "private" })).not.toContain("quotePolicy");
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
      Option.getOrThrow(Result.getOrThrow(optionsOf("googleBusiness", filled)))
    ).toStrictEqual({
      callToAction: "order",
      callToActionUrl: "https://example.com/order",
      platform: "googleBusiness",
    });
    expect(
      Option.getOrThrow(
        Result.getOrThrow(
          optionsOf("googleBusiness", { ...filled, postType: "offer" })
        )
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
      Result.succeed(
        Option.some({
          boardId: "549755885001",
          boardSectionId: "5000000000001",
          coverSecond: 12,
          link: "https://peal.example/recipes",
          platform: "pinterest",
          title: "Tomato salad",
        })
      )
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
      ["c2", "facebook"],
    ]);

    const values = valuesOfPost(
      {
        authorId: null,
        content: { media: [], overrides: [], text: "A synthetic video" },
        createdVia: null,
        id: "00000000-0000-7000-8000-000000000009",
        outcome: null,
        queueId: null,
        schedule: null,
        scheduledBy: null,
        scheduledVia: null,
        status: "draft",
        tagIds: [],
        targets: ["c1", "c2", "gone"].map((id) => ({
          channelId: id,
          failureReason: null,
          id: `target-${id}`,
          options: id === "c1" ? { platform: "youtube", title: "Hi" } : null,
          parts: { count: 1, live: [] },
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
          { id: "c2", platform: "facebook" },
        ],
        { c1: { ...initialValues("tiktok"), privacyLevel: "SELF_ONLY" } }
      )
    ).toStrictEqual({
      options: [
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
            privacyLevel: "SELF_ONLY",
          },
        },
      ],
      problems: [],
    });
  });

  it("sends no options where the member chose none, so the channel's defaults apply", () => {
    const channels = [
      { id: "c1", platform: "mastodon" },
      { id: "c2", platform: "bluesky" },
      { id: "c3", platform: "x" },
      { id: "c4", platform: "tiktok" },
      { id: "c5", platform: "youtube" },
    ] as const;

    expect(channelOptionsOf(channels, {})).toStrictEqual({
      options: [],
      problems: [],
    });
    // A box ticked then unticked, a text typed then erased: nothing chosen.
    expect(
      channelOptionsOf(channels, {
        c1: { contentWarning: "" },
        c3: { ...initialValues("x"), paidPartnership: false },
      })
    ).toStrictEqual({ options: [], problems: [] });
    expect(
      channelOptionsOf(channels, { c1: { visibility: "private" } }).options
    ).toStrictEqual([
      {
        channelId: "c1",
        options: { platform: "mastodon", visibility: "private" },
      },
    ]);
  });

  it("keeps the defaults a new draft took on its next save", () => {
    const platforms = new Map<string, Platform>([["c1", "mastodon"]]);

    // The draft the server made, which took the channel's defaults.
    const values = valuesOfPost(
      {
        authorId: null,
        content: { media: [], overrides: [], text: "A synthetic toot" },
        createdVia: null,
        id: "00000000-0000-7000-8000-000000000009",
        outcome: null,
        schedule: null,
        scheduledBy: null,
        scheduledVia: null,
        status: "draft",
        tagIds: [],
        targets: [
          {
            channelId: "c1",
            failureReason: null,
            id: "target-c1",
            options: { platform: "mastodon", visibility: "private" },
            parts: { count: 1, live: [] },
            permalink: null,
            publishedAt: null,
            round: 1,
            status: "pending",
            unconfirmedReason: null,
          },
        ],
      },
      (id) => Option.fromUndefinedOr(platforms.get(id))
    );

    expect(
      channelOptionsOf([{ id: "c1", platform: "mastodon" }], values).options
    ).toStrictEqual([
      {
        channelId: "c1",
        options: { platform: "mastodon", visibility: "private" },
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

describe("LinkedIn's mentions", () => {
  const bakery = {
    name: "Example Bakery",
    urn: "urn:li:organization:9000000001",
  };

  const bikes = { name: "Example (UK)", urn: "urn:li:organization:9000000002" };

  it("show as names and URNs, and come back as the API takes them", () => {
    const values = valuesOf("linkedin", {
      mentions: [bakery, bikes],
      platform: "linkedin",
    });

    expect(values["mentions"]).toBe(
      "Example Bakery <urn:li:organization:9000000001>; Example (UK) <urn:li:organization:9000000002>"
    );
    expect(optionsOf("linkedin", values)).toStrictEqual(
      Result.succeed(
        Option.some({
          disableReshare: false,
          mentions: [bakery, bikes],
          platform: "linkedin",
        })
      )
    );
  });

  it("keep an entry typed without its URN, for scheduling to refuse", () => {
    expect(
      optionsOf("linkedin", { mentions: "Example Bakery;  " })
    ).toStrictEqual(
      Result.succeed(
        Option.some({
          mentions: [{ name: "Example Bakery", urn: "" }],
          platform: "linkedin",
        })
      )
    );
  });
});

describe("options the contract would refuse as filled in", () => {
  const bluesky = "00000000-0000-7000-8000-00000000000b";

  const gated = {
    contentLabel: "porn",
    disableQuotes: true,
    languages: "en, fr, de, es",
    replies: "nobody",
  };

  it("name the field at fault, and never answer that there are no options", () => {
    expect(optionsOf("bluesky", gated)).toStrictEqual(
      Result.fail([
        { _tag: "tooMany", count: 4, field: "languages", maximum: 3 },
      ])
    );
    expect(
      optionsOf("bluesky", { ...gated, languages: "en, fr, de" })
    ).toStrictEqual(
      Result.succeed(
        Option.some({
          contentLabel: "porn",
          disableQuotes: true,
          languages: ["en", "fr", "de"],
          platform: "bluesky",
          replies: "nobody",
        })
      )
    );
  });

  it("keep the channel's choices out of no request: the composer gets the problem", () => {
    expect(
      channelOptionsOf([{ id: bluesky, platform: "bluesky" }], {
        [bluesky]: gated,
      })
    ).toStrictEqual({
      options: [],
      problems: [
        {
          _tag: "tooMany",
          channelId: bluesky,
          count: 4,
          field: "languages",
          maximum: 3,
        },
      ],
    });
  });

  it("find the same on the other platforms' fields", () => {
    const pages = Array.from(
      { length: 31 },
      (_, index) =>
        `Page ${String(index)} <urn:li:organization:${String(index)}>`
    ).join("; ");

    expect(optionsOf("linkedin", { mentions: pages })).toStrictEqual(
      Result.fail([
        { _tag: "tooMany", count: 31, field: "mentions", maximum: 30 },
      ])
    );
    expect(
      optionsOf("linkedin", {
        mentions: `Example Bakery <urn:li:organization:${"9".repeat(80)}>`,
        visibility: "public",
      })
    ).toStrictEqual(Result.fail([{ _tag: "invalid", field: "mentions" }]));
    expect(
      optionsOf("pinterest", { boardId: "549755885001", coverSecond: "1.5" })
    ).toStrictEqual(Result.fail([{ _tag: "invalid", field: "coverSecond" }]));
    expect(
      optionsOf("x", {
        communityId: `17${String.fromCodePoint(0)}01`,
        replySettings: "following",
      })
    ).toStrictEqual(Result.fail([{ _tag: "invalid", field: "communityId" }]));
  });
});
