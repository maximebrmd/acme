import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";
import { optionsPlatforms, TargetOptionsSchema } from "peal-contract";
import type { ContentViolation, MediaKind, Platform } from "peal-contract";

import type { AttachedMedia } from "#posts/media-fit.ts";
import {
  channelOptionsOf,
  fieldOf,
  fieldsOf,
  initialValues,
  isShown,
  mediaKindsOf,
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

    expect(fieldsOf("facebook").map(({ name }) => name)).toStrictEqual([
      "format",
      "videoTitle",
    ]);
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
      "instagram",
      {
        audioName: "Synthetic theme",
        collaborators: "peal.example, synthetic_baker",
        coverMediaId: "019a0000-0000-7000-8000-000000000001",
        shareToFeed: false,
        thumbOffsetMs: "1500",
        trialReel: "performance",
      },
    ],
    ["facebook", { videoTitle: "A synthetic launch video" }],
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
      "facebook",
      "googleBusiness",
      "instagram",
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
      autoAddMusic: false,
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

  it("gives the platform alone where nothing it takes is filled in", () => {
    expect(optionsOf("instagram", { title: "Hi" })).toStrictEqual(
      Result.succeed(Option.some({ platform: "instagram" }))
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
        occurrence: null,
        outcome: null,
        queueId: null,
        recyclingId: null,
        schedule: null,
        scheduledBy: null,
        scheduledVia: null,
        shortenLinks: false,
        status: "draft",
        tagIds: [],
        targets: ["c1", "c2", "gone"].map((id) => ({
          channelId: id,
          editedAt: null,
          failureReason: null,
          id: `target-${id}`,
          options: id === "c1" ? { platform: "youtube", title: "Hi" } : null,
          parts: { count: 1, live: [] },
          permalink: null,
          publishedAt: null,
          removedAt: null,
          round: 1,
          status: "pending",
          unconfirmedReason: null,
        })),
      },
      (id) => Option.fromUndefinedOr(platforms.get(id))
    );

    expect(values).toStrictEqual({
      c1: { ...initialValues("youtube"), title: "Hi" },
      c2: {},
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
        { c1: { ...initialValues("tiktok"), privacyLevel: "SELF_ONLY" } },
        // A video: the photo post's box is not shown, and not sent.
        ["video"]
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
        occurrence: null,
        outcome: null,
        queueId: null,
        recyclingId: null,
        schedule: null,
        scheduledBy: null,
        scheduledVia: null,
        shortenLinks: false,
        status: "draft",
        tagIds: [],
        targets: [
          {
            channelId: "c1",
            editedAt: null,
            failureReason: null,
            id: "target-c1",
            options: { platform: "mastodon", visibility: "private" },
            parts: { count: 1, live: [] },
            permalink: null,
            publishedAt: null,
            removedAt: null,
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

const thumbnail = "019a0000-0000-7000-8000-00000000000a";

describe("fields that name a file of the library", () => {
  it("send the file's id, and fill it back", () => {
    const values = { thumbnailMediaId: thumbnail, title: "A synthetic video" };

    expect(
      Result.getOrThrow(optionsOf("youtube", values)).pipe(
        Option.map((options) => ({
          options,
          values: valuesOf("youtube", options),
        }))
      )
    ).toStrictEqual(
      Option.some({
        options: {
          platform: "youtube",
          thumbnailMediaId: thumbnail,
          title: "A synthetic video",
        },
        values: { ...initialValues("youtube"), ...values },
      })
    );
    expect(fieldOf("youtube", "thumbnailMediaId")).toStrictEqual(
      Option.some(
        expect.objectContaining({
          contentTypes: ["image/jpeg", "image/png"],
          kind: "media",
        })
      )
    );
    expect(fieldOf("instagram", "coverMediaId")).toStrictEqual(
      Option.some(
        expect.objectContaining({ contentTypes: ["image/jpeg"], kind: "media" })
      )
    );
  });

  it("refuse what is not a file's id, as the contract does", () => {
    expect(
      optionsOf("youtube", { thumbnailMediaId: "not-a-media-id" })
    ).toStrictEqual(
      Result.fail([{ _tag: "invalid", field: "thumbnailMediaId" }])
    );
  });
});

// The names of the TikTok fields a post of these media shows.
const shownTikTok = (media: readonly MediaKind[] | undefined) =>
  fieldsOf("tiktok")
    .filter((field) => isShown("tiktok", field, initialValues("tiktok"), media))
    .map(({ name }) => name);

// The names of the Instagram fields a post of these media shows.
const shownInstagram = (media: readonly MediaKind[]) =>
  fieldsOf("instagram")
    .filter((field) => isShown("instagram", field, {}, media))
    .map(({ name }) => name);

describe("fields that follow the post's media", () => {
  const reelFields = [
    "shareToFeed",
    "coverMediaId",
    "thumbOffsetMs",
    "audioName",
    "trialReel",
  ];

  it("show a video's cover frame on a video, and the photos' fields on photos", () => {
    const video = shownTikTok(["video"]);
    const photos = shownTikTok(["image", "image"]);

    expect(video).toContain("videoCoverTimestampMs");
    expect(video).not.toContain("photoTitle");
    expect(photos).toStrictEqual(
      expect.arrayContaining(["photoTitle", "autoAddMusic", "photoCoverIndex"])
    );
    expect(photos).not.toContain("videoCoverTimestampMs");
  });

  it("show neither without media, and every field while the media are read", () => {
    expect(shownTikTok([])).not.toContain("photoTitle");
    expect(shownTikTok([])).not.toContain("videoCoverTimestampMs");
    expect(shownTikTok(undefined)).toStrictEqual(
      fieldsOf("tiktok").map(({ name }) => name)
    );
  });

  it("show a reel's fields on a post of one video alone", () => {
    expect(shownInstagram(["video"])).toStrictEqual([
      "format",
      ...reelFields,
      "collaborators",
    ]);

    const others: readonly (readonly MediaKind[])[] = [
      ["video", "video"],
      ["image"],
      [],
    ];

    expect(others.map(shownInstagram)).toStrictEqual([
      ["format", "collaborators"],
      ["format", "collaborators"],
      ["format", "collaborators"],
    ]);
  });

  it("show a story its format alone, and send none of a feed post's", () => {
    const story = { collaborators: "peal.example", format: "story" };

    expect(
      fieldsOf("instagram")
        .filter((field) => isShown("instagram", field, story, ["video"]))
        .map(({ name }) => name)
    ).toStrictEqual(["format"]);
    expect(optionsOf("instagram", story, ["video"])).toStrictEqual(
      Result.succeed(Option.some({ format: "story", platform: "instagram" }))
    );
    expect(
      fieldOf("facebook", "format").pipe(
        Option.map((field) =>
          field.kind === "choice"
            ? [field.none, ...field.choices.map(({ value }) => value)]
            : []
        )
      )
    ).toStrictEqual(Option.some(["facebook.formatFeed", "story", "reel"]));
  });

  it("send no field the media hide", () => {
    const values = {
      audioName: "Synthetic theme",
      collaborators: "peal.example",
      shareToFeed: true,
    };

    expect(optionsOf("instagram", values, ["image", "image"])).toStrictEqual(
      Result.succeed(
        Option.some({ collaborators: ["peal.example"], platform: "instagram" })
      )
    );
    expect(
      optionsOf("facebook", { videoTitle: "A synthetic video" }, ["image"])
    ).toStrictEqual(Result.succeed(Option.some({ platform: "facebook" })));
    expect(
      channelOptionsOf(
        [{ id: "c1", platform: "facebook" }],
        { c1: { videoTitle: "A synthetic video" } },
        ["image"]
      )
    ).toStrictEqual({ options: [], problems: [] });
    expect(
      channelOptionsOf(
        [{ id: "c1", platform: "facebook" }],
        { c1: { videoTitle: "A synthetic video" } },
        ["image", "video"]
      ).options
    ).toStrictEqual([
      {
        channelId: "c1",
        options: { platform: "facebook", videoTitle: "A synthetic video" },
      },
    ]);
  });

  it("send no options on Instagram, Facebook or TikTok where nothing was chosen", () => {
    const channels = [
      { id: "c1", platform: "instagram" },
      { id: "c2", platform: "facebook" },
      { id: "c3", platform: "tiktok" },
    ] as const;

    for (const media of [
      undefined,
      [],
      ["video"],
      ["image", "image"],
    ] as const) {
      expect(channelOptionsOf(channels, {}, media)).toStrictEqual({
        options: [],
        problems: [],
      });
    }
  });

  it("send a photo post's music only when it is ticked, and only on photos", () => {
    const values = {
      ...initialValues("tiktok"),
      autoAddMusic: true,
      privacyLevel: "SELF_ONLY",
    };

    expect(
      Result.getOrThrow(optionsOf("tiktok", values, ["image"])).pipe(
        Option.map(
          (options) => "autoAddMusic" in options && options.autoAddMusic
        )
      )
    ).toStrictEqual(Option.some(true));
    expect(
      Result.getOrThrow(optionsOf("tiktok", values, ["video"])).pipe(
        Option.map((options) => "autoAddMusic" in options)
      )
    ).toStrictEqual(Option.some(false));
  });

  it("name what is wrong in a field the media show, and nothing in one they hide", () => {
    expect(
      optionsOf("tiktok", { videoCoverTimestampMs: "1.5s" }, ["video"])
    ).toStrictEqual(
      Result.fail([{ _tag: "invalid", field: "videoCoverTimestampMs" }])
    );
    expect(
      optionsOf("tiktok", { videoCoverTimestampMs: "1.5s" }, ["image"])
    ).toStrictEqual(Result.succeed(Option.some({ platform: "tiktok" })));
  });
});

describe("Instagram's collaborators", () => {
  it("take three accounts at most", () => {
    expect(
      optionsOf("instagram", { collaborators: "a.one, b_two, c3, d4" })
    ).toStrictEqual(
      Result.fail([
        { _tag: "tooMany", count: 4, field: "collaborators", maximum: 3 },
      ])
    );
    expect(
      optionsOf("instagram", { collaborators: "a.one, b_two, c3" })
    ).toStrictEqual(
      Result.succeed(
        Option.some({
          collaborators: ["a.one", "b_two", "c3"],
          platform: "instagram",
        })
      )
    );
  });
});

const created = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const libraryFile = (id: string, kind: MediaKind): AttachedMedia => ({
  altText: "",
  media: Option.some({
    aiGenerated: false,
    altText: null,
    byteSize: 200_000,
    codec: null,
    contentType: kind === "video" ? "video/mp4" : "image/jpeg",
    createdAt: created,
    dimensions: null,
    durationMs: null,
    fileName: null,
    id,
    kind,
    pageCount: null,
    status: { _tag: "ready" },
    updatedAt: created,
    url: null,
  }),
  mediaId: id,
});

describe(mediaKindsOf, () => {
  it("gives the attachments' kinds once each is read, and nothing until then", () => {
    const pending: AttachedMedia = {
      altText: "",
      media: Option.none(),
      mediaId: "b",
    };

    expect(mediaKindsOf([])).toStrictEqual([]);
    expect(
      mediaKindsOf([libraryFile("a", "image"), libraryFile("c", "video")])
    ).toStrictEqual(["image", "video"]);
    expect(mediaKindsOf([libraryFile("a", "image"), pending])).toBeUndefined();
  });
});
