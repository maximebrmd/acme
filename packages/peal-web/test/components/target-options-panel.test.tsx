import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { PostContentInvalid } from "peal-contract";
import type {
  AccountStanding,
  Channel,
  ContentViolation,
  Media,
  TikTokCreator,
} from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { ComposerErrors } from "#components/posts/composer-errors.tsx";
import {
  BlueskyOptionsFields,
  MediaOptionView,
  PinterestOptionsFields,
  takesOptions,
  TargetOptionsPanel,
  TargetOptionsSection,
  TikTokOptionsFields,
} from "#components/posts/target-options-panel.tsx";
import type {
  ChosenMedia,
  LookupSource,
  TikTokAccountState,
} from "#components/posts/target-options-panel.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { fieldOf, initialValues } from "#posts/target-options.ts";
import type { OptionValues, PostMediaKinds } from "#posts/target-options.ts";

const channel = (
  id: string,
  platform: Channel["platform"],
  handle: string
): Channel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle,
  id,
  label: null,
  platform,
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const youtube = channel(
  "00000000-0000-7000-8000-000000000001",
  "youtube",
  "@peal_videos"
);

const tiktok = channel(
  "00000000-0000-7000-8000-000000000002",
  "tiktok",
  "@peal_clips"
);

const facebookPage = channel(
  "00000000-0000-7000-8000-000000000003",
  "facebook",
  "Synthetic Bakery"
);

const location = channel(
  "00000000-0000-7000-8000-000000000004",
  "googleBusiness",
  "1 Synthetic Street, Exampleville"
);

const renderLocation = async (locale: Locale, values: OptionValues) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TargetOptionsPanel
        channels={[location]}
        disabled={false}
        valuesOf={() => values}
        violations={[
          {
            _tag: "optionInvalid",
            channelId: location.id,
            field: "endsAt",
            platform: "googleBusiness",
          },
        ]}
        onChange={() => {
          // Rendered once, never changed.
        }}
      />
    </NextIntlClientProvider>
  );
};

const violations: readonly ContentViolation[] = [
  {
    _tag: "optionMissing",
    channelId: youtube.id,
    field: "madeForKids",
    platform: "youtube",
  },
  {
    _tag: "optionTooLong",
    channelId: youtube.id,
    field: "title",
    length: 120,
    maximum: 100,
    platform: "youtube",
  },
  {
    _tag: "optionInvalid",
    channelId: tiktok.id,
    field: "brandContent",
    platform: "tiktok",
  },
];

const render = async (
  locale: Locale,
  values: Readonly<Record<string, OptionValues>> = {},
  // A post without media: Facebook has nothing to ask.
  media: PostMediaKinds = []
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TargetOptionsPanel
        channels={[youtube, facebookPage, tiktok]}
        disabled={false}
        media={media}
        valuesOf={(shown) => values[shown.id] ?? initialValues(shown.platform)}
        violations={violations}
        onChange={() => {
          // Rendered once, never changed.
        }}
      />
    </NextIntlClientProvider>
  );
};

describe(TargetOptionsPanel, () => {
  it("shows the fields of each channel whose platform takes options", async () => {
    const html = await render("en");

    expect(html).toContain("@peal_videos on YouTube: options");
    expect(html).toContain("Title (required)");
    expect(html).toContain("Made for kids (required)");
    expect(html).toContain("Who can view this post (required)");
    expect(html).not.toContain("Synthetic Bakery");
  });

  it("starts TikTok's interactions off, and its disclosure untold", async () => {
    const html = await render("en");

    expect(html).toContain("Allow comments");
    expect(html).toContain('aria-checked="false"');
    // Under the disclosure, which is off.
    expect(html).not.toContain("Your brand");
  });

  it("shows under each field what scheduling refused", async () => {
    const html = await render("en");

    expect(html).toContain("Required to schedule.");
    expect(html).toContain("120 of 100 characters.");
    expect(html).toContain('aria-invalid="true"');
  });

  it("shows whose brand once the disclosure is on", async () => {
    const html = await render("en", {
      [tiktok.id]: {
        ...initialValues("tiktok"),
        brandContent: true,
        commercialContent: true,
        privacyLevel: "SELF_ONLY",
      },
    });

    expect(html).toContain("Your brand");
    expect(html).toContain(
      "Branded content cannot be visible to you only: choose who can view it."
    );
  });

  it("speaks the reader's language", async () => {
    const html = await render("fr");

    expect(html).toContain("@peal_videos sur YouTube : options");
    expect(html).toContain("Titre (obligatoire)");
    expect(html).toContain("Obligatoire pour programmer.");
    expect(html).toContain("Autoriser les commentaires");
  });

  it("shows a Google Business Profile update its button", async () => {
    const update = await renderLocation("en", {});

    expect(update).toContain(
      "1 Synthetic Street, Exampleville on Google Business Profile: options"
    );
    expect(update).toContain("Post type");
    expect(update).toContain("Button");
    expect(update).not.toContain("Starts (required)");
    expect(update).not.toContain("Coupon code");
  });

  it("shows a Google Business Profile event its title, dates and button link", async () => {
    const event = await renderLocation("en", {
      callToAction: "learnMore",
      endsAt: "2026-11-27T08:00",
      postType: "event",
      startsAt: "2026-11-27T09:00",
    });

    expect(event).toContain("Title (required)");
    expect(event).toContain('type="datetime-local"');
    expect(event).toContain('value="2026-11-27T09:00"');
    expect(event).toContain("Choose a day and a time after the start.");
    expect(event).toContain("Button link (required)");
  });

  it("shows a Google Business Profile offer its code and terms, and no button", async () => {
    const offer = await renderLocation("fr", {
      callToAction: "learnMore",
      postType: "offer",
    });

    expect(offer).toContain("Code promotionnel");
    expect(offer).toContain("Conditions générales");
    expect(offer).not.toContain("Lien du bouton");
  });

  it("shows every platform's fields together, each kind of field in one panel", async () => {
    const page = channel(
      "00000000-0000-7000-8000-000000000005",
      "linkedin",
      "Example Bakery"
    );

    const pins = channel(
      "00000000-0000-7000-8000-000000000006",
      "pinterest",
      "peal_pins"
    );

    const every = [youtube, tiktok, page, pins, location];

    const filled = new Map<string, OptionValues>([
      [location.id, { postType: "event" }],
      [
        page.id,
        { mentions: "Example Bakery <urn:li:organization:9000000001>" },
      ],
    ]);

    const [english, french] = await Promise.all(
      (["en", "fr"] as const).map(async (locale) =>
        renderToStaticMarkup(
          <NextIntlClientProvider
            locale={locale}
            messages={await loadMessages(locale)}
          >
            <TargetOptionsPanel
              channels={every}
              disabled={false}
              valuesOf={(shown) =>
                filled.get(shown.id) ?? initialValues(shown.platform)
              }
              violations={[]}
              onChange={() => {
                // Rendered once, never changed.
              }}
            />
          </NextIntlClientProvider>
        )
      )
    );

    // A text, a choice, a yes or no and a box; mentions; a lookup still
    // read and a number; a time on the location's clock, shown with its
    // post type.
    for (const label of [
      "Title (required)",
      "Who can view this post (required)",
      "Who can see this post",
      "Pages to mention",
      "Example Bakery &lt;urn:li:organization:9000000001&gt;",
      "Board (required)",
      "Reading the list on the platform…",
      "Video cover, at second",
      "Post type",
      "Starts (required)",
    ]) {
      expect(english).toContain(label);
    }

    expect(english).toContain('type="datetime-local"');
    expect(english).toContain('type="number"');

    for (const label of [
      "Qui peut voir cette publication",
      "Pages à mentionner",
      "Tableau (obligatoire)",
      "Couverture de la vidéo, à la seconde",
      "Type de publication",
    ]) {
      expect(french).toContain(label);
    }
  });

  it("shows the options of Mastodon, Bluesky, Threads and X, in both languages", async () => {
    const feeds = [
      channel("00000000-0000-7000-8000-000000000011", "mastodon", "@peal"),
      channel("00000000-0000-7000-8000-000000000012", "bluesky", "peal.bsky"),
      channel("00000000-0000-7000-8000-000000000013", "threads", "@peal"),
      channel("00000000-0000-7000-8000-000000000014", "x", "@peal_social"),
    ];

    const shown = async (locale: Locale) => {
      const messages = await loadMessages(locale);

      return renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TargetOptionsPanel
            channels={feeds}
            disabled={false}
            valuesOf={(one) => initialValues(one.platform)}
            violations={[]}
            onChange={() => {
              // Rendered once, never changed.
            }}
          />
        </NextIntlClientProvider>
      );
    };

    const english = await shown("en");

    for (const label of [
      "Content warning",
      "counts it in the post’s character limit",
      "Content label",
      "a part without media is sent without it",
      "Link preview",
      "Who can reply",
      "Paid partnership",
    ]) {
      expect(english).toContain(label);
    }

    // Shown once a community is written.
    expect(english).not.toContain("Also share with followers");

    const french = await shown("fr");

    for (const label of [
      "Avertissement de contenu",
      "Étiquette de contenu",
      "Aperçu de lien",
      "Partenariat rémunéré",
    ]) {
      expect(french).toContain(label);
    }
  });

  it("shows what the API would refuse as it is typed, and says nothing goes out until fixed", async () => {
    const bluesky = channel(
      "00000000-0000-7000-8000-000000000012",
      "bluesky",
      "peal.bsky"
    );

    const typed = async (locale: Locale) => {
      const messages = await loadMessages(locale);

      return renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TargetOptionsSection
            channels={[bluesky]}
            disabled={false}
            failure={null}
            valuesOf={() => ({
              ...initialValues("bluesky"),
              languages: "en, fr, de, es",
              replies: "nobody",
            })}
            onChange={() => {
              // Rendered once, never changed.
            }}
          />
        </NextIntlClientProvider>
      );
    };

    const english = await typed("en");

    expect(english).toContain("4 given: 3 at most.");
    expect(english).toContain(
      "Fix the options marked below: the post cannot be saved or scheduled until then."
    );
    expect(english).toContain('aria-invalid="true"');
    await expect(typed("fr")).resolves.toContain("4 indiqués : 3 au plus.");
  });

  it("offers Bluesky's gates only on a channel that holds their scopes", async () => {
    const bluesky = channel(
      "00000000-0000-7000-8000-000000000012",
      "bluesky",
      "peal.bsky"
    );

    const shown = async (locale: Locale, standing: AccountStanding) => {
      const messages = await loadMessages(locale);

      return renderToStaticMarkup(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <BlueskyOptionsFields
            channel={bluesky}
            disabled={false}
            standing={Option.some(standing)}
            values={initialValues("bluesky")}
            violations={[]}
            onChange={() => {
              // Rendered once, never changed.
            }}
          />
        </NextIntlClientProvider>
      );
    };

    const ungated: AccountStanding = {
      _tag: "read",
      blocked: null,
      restrictions: [
        { _tag: "optionNeedsReconnect", field: "replies" },
        { _tag: "optionNeedsReconnect", field: "disableQuotes" },
      ],
    };

    const english = await shown("en", ungated);

    const reconnect =
      "This account was connected before Peal asked to limit replies and quotes: reconnect it on the Channels page to choose them.";

    expect(english).toContain(reconnect);
    // Said once for the field of choices, once for the box.
    expect(english.split(reconnect)).toHaveLength(3);
    await expect(shown("fr", ungated)).resolves.toContain(
      "reconnectez-le sur la page Canaux"
    );
    await expect(
      shown("en", { _tag: "read", blocked: null, restrictions: [] })
    ).resolves.not.toContain(reconnect);
  });

  it("shows only for platforms that take options on the post's media", () => {
    expect(takesOptions([facebookPage], ["image"])).toBeFalsy();
    expect(takesOptions([facebookPage], ["video"])).toBeTruthy();
    // While the media are read, every field shows.
    expect(takesOptions([facebookPage])).toBeTruthy();
    expect(takesOptions([facebookPage, youtube], [])).toBeTruthy();
  });
});

const renderTikTok = async (
  locale: Locale,
  state: TikTokAccountState,
  values: OptionValues = initialValues("tiktok")
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TikTokOptionsFields
        channel={tiktok}
        disabled={false}
        photos={false}
        state={state}
        values={values}
        violations={[]}
        onChange={() => {
          // Rendered once, never changed.
        }}
      />
    </NextIntlClientProvider>
  );
};

const creator: TikTokCreator = {
  avatarUrl: null,
  commentDisabled: true,
  duetDisabled: false,
  maxVideoDurationMs: 600_000,
  nickname: "Peal Clips",
  privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  stitchDisabled: false,
  username: "peal_clips",
};

const loadedWith = (shown: TikTokCreator): TikTokAccountState => ({
  _tag: "loaded",
  account: { posting: { _tag: "ready", creator: shown }, takesPhotos: true },
});

const loaded = loadedWith(creator);

describe(TikTokOptionsFields, () => {
  it("names who posts, greys out what they turned off, and asks consent", async () => {
    const html = await renderTikTok("en", loaded);

    expect(html).toContain("Posting as Peal Clips (@peal_clips).");
    expect(html).toContain("Turned off in the account’s TikTok settings.");
    expect(html).toMatch(
      /By posting, you agree to TikTok’s <a [^>]+>Music Usage Confirmation<\/a>\./u
    );
    expect(html).toContain("may take a few minutes to process");
  });

  it("labels branded content, and asks consent to its policy", async () => {
    const html = await renderTikTok("en", loaded, {
      ...initialValues("tiktok"),
      brandContent: true,
      commercialContent: true,
    });

    expect(html).toContain("Your video will be labeled “Paid partnership”.");
    expect(html).toContain(
      "Branded content visibility cannot be set to private."
    );
    expect(html).toMatch(
      /By posting, you agree to TikTok’s <a [^>]+>Branded Content Policy<\/a> and <a [^>]+>Music Usage Confirmation<\/a>\./u
    );
  });

  it("links the consent to TikTok's policies", async () => {
    const music = await renderTikTok("en", loaded);

    const branded = await renderTikTok("fr", loaded, {
      ...initialValues("tiktok"),
      brandContent: true,
      commercialContent: true,
    });

    expect(music).toContain(
      'href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"'
    );
    expect(music).not.toContain("bc-policy");
    expect(branded).toContain(
      'href="https://www.tiktok.com/legal/page/global/bc-policy/en"'
    );
    expect(branded).toContain(
      'href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"'
    );
  });

  it("names a creator without a username by their nickname alone", async () => {
    const html = await renderTikTok(
      "en",
      loadedWith({ ...creator, username: "" })
    );

    expect(html).toContain("Posting as Peal Clips.");
    expect(html).not.toContain("(@)");
  });

  it("says why the creator cannot post, or TikTok could not say", async () => {
    const blocked = await renderTikTok("en", {
      _tag: "loaded",
      account: {
        posting: { _tag: "blocked", reason: "postLimit" },
        takesPhotos: true,
      },
    });

    const failed = await renderTikTok("fr", {
      _tag: "failed",
      reason: "reconnect",
    });

    expect(blocked).toContain("as many posts today as TikTok allows");
    expect(failed).toContain(
      "Reconnectez ce compte pour lire ses réglages sur TikTok."
    );
  });

  it("speaks the reader's language", async () => {
    const html = await renderTikTok("fr", loaded);

    expect(html).toContain("Publication en tant que Peal Clips (@peal_clips).");
    expect(html).toMatch(
      /En publiant, vous acceptez la <a [^>]+>Confirmation d’utilisation de la musique<\/a> de TikTok\./u
    );
  });
});

const pinterest = channel(
  "00000000-0000-7000-8000-000000000004",
  "pinterest",
  "@pealexample"
);

const boardChoices = [
  { label: "Summer recipes", value: "549755885001" },
  { label: "Garden", value: "549755885002" },
];

const boards: LookupSource = {
  choices: { _tag: "loaded", choices: boardChoices, truncated: false },
};

const noSections: LookupSource = {
  choices: { _tag: "loaded", choices: [], truncated: false },
};

const renderPinterest = async (
  locale: Locale,
  sources: {
    readonly boards: LookupSource;
    readonly sections?: LookupSource;
  },
  values: OptionValues = {},
  refused: readonly ContentViolation[] = []
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PinterestOptionsFields
        channel={pinterest}
        disabled={false}
        boards={sources.boards}
        sections={sources.sections ?? noSections}
        values={values}
        violations={refused}
        onChange={() => {
          // Rendered once, never changed.
        }}
      />
    </NextIntlClientProvider>
  );
};

const boardsFailed = async (
  reason: "rateLimited" | "reconnect" | "unreachable"
) =>
  await renderPinterest("en", {
    boards: {
      choices: { _tag: "failed", reason },
      retry: () => {
        // Never clicked in a static render.
      },
    },
  });

describe(PinterestOptionsFields, () => {
  it("says the boards are being read", async () => {
    const html = await renderPinterest("en", {
      boards: { choices: { _tag: "loading" } },
    });

    expect(html).toContain("@pealexample on Pinterest: options");
    expect(html).toContain("Board (required)");
    expect(html).toContain("Reading the list on the platform…");
  });

  it("offers the boards once read, with the Pin's other fields", async () => {
    const html = await renderPinterest(
      "en",
      { boards },
      { boardId: "549755885002" }
    );

    expect(html).not.toContain("Reading the list");
    expect(html).toContain("Garden");
    expect(html).toContain("Title");
    expect(html).toContain("Video cover, at second");
  });

  it("shows a board's sections once a board is chosen and has some", async () => {
    const sections: LookupSource = {
      choices: {
        _tag: "loaded",
        choices: [{ label: "Salads", value: "5000000000001" }],
        truncated: false,
      },
    };

    const unchosen = await renderPinterest("en", { boards, sections });

    const chosen = await renderPinterest(
      "en",
      { boards, sections },
      { boardId: "549755885001", boardSectionId: "5000000000001" }
    );

    const without = await renderPinterest(
      "en",
      { boards },
      { boardId: "549755885001" }
    );

    expect(unchosen).not.toContain("Board section");
    expect(chosen).toContain("Board section");
    expect(chosen).toContain("Salads");
    expect(without).not.toContain("Board section");
  });

  it("says why the boards could not be read, with a way to ask again", async () => {
    await expect(boardsFailed("reconnect")).resolves.toContain(
      "Reconnect this account to read its list."
    );
    await expect(boardsFailed("rateLimited")).resolves.toContain(
      "The platform asked to slow down."
    );

    const unreachable = await boardsFailed("unreachable");

    expect(unreachable).toContain("The list could not be read");
    expect(unreachable).toContain("Try again</button>");
  });

  it("says an account has no board, and keeps a board the list lacks", async () => {
    const empty = await renderPinterest("en", { boards: noSections });

    const gone = await renderPinterest(
      "en",
      {
        boards: {
          choices: { _tag: "loaded", choices: boardChoices, truncated: true },
        },
      },
      { boardId: "549755885999" }
    );

    expect(empty).toContain("This account has no board yet");
    expect(gone).toContain("Not in the list (549755885999)");
    expect(gone).toContain("Only the first 2 are listed.");
  });

  it("shows what scheduling refused, in the reader's language", async () => {
    const html = await renderPinterest(
      "fr",
      { boards },
      { link: "peal.example" },
      [
        {
          _tag: "optionMissing",
          channelId: pinterest.id,
          field: "boardId",
          platform: "pinterest",
        },
        {
          _tag: "optionInvalid",
          channelId: pinterest.id,
          field: "link",
          platform: "pinterest",
        },
      ]
    );

    expect(html).toContain("Tableau (obligatoire)");
    expect(html).toContain("Obligatoire pour programmer.");
    expect(html).toContain(
      "Un lien commence par http:// ou https://, sans espace."
    );
  });
});

describe("the composer's errors about options", () => {
  it("name the option, channel by channel", async () => {
    const messages = await loadMessages("en");

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ComposerErrors
          channels={[youtube, tiktok, facebookPage]}
          failure={
            new PostContentInvalid({
              violations: [
                ...violations,
                {
                  _tag: "optionsForOtherPlatform",
                  channelId: facebookPage.id,
                  optionsPlatform: "tiktok",
                  platform: "facebook",
                },
              ],
            })
          }
        />
      </NextIntlClientProvider>
    );

    expect(html).toContain(
      "@peal_videos on YouTube: Made for kids is required."
    );
    expect(html).toContain(
      "@peal_videos on YouTube: Title, 120 of 100 characters."
    );
    expect(html).toContain(
      "@peal_clips on TikTok: Branded content cannot be visible to you only"
    );
    expect(html).toContain(
      "Synthetic Bakery on Facebook: these options are for TikTok."
    );
  });
});

const instagram = channel(
  "00000000-0000-7000-8000-000000000007",
  "instagram",
  "peal.example"
);

const renderChannels = async (
  locale: Locale,
  channels: readonly Channel[],
  media: PostMediaKinds,
  values: OptionValues = {}
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      <TargetOptionsPanel
        channels={channels}
        disabled={false}
        media={media}
        valuesOf={(shown) =>
          shown.platform === "tiktok" ? initialValues("tiktok") : values
        }
        violations={[]}
        onChange={() => {
          // Rendered once, never changed.
        }}
      />
    </NextIntlClientProvider>
  );

// The labels of TikTok's media fields a render shows, in either language.
const tiktokLabelsIn = (html: string) =>
  [
    "Photo post title",
    "Cover photo",
    "Add music automatically",
    "Cover frame, in milliseconds",
    "Titre de la publication photo",
    "Ajouter de la musique automatiquement",
  ].filter((label) => html.includes(label));

describe("fields that follow the post's media", () => {
  it("show a reel's settings on one video, and collaborators on any post", async () => {
    const reel = await renderChannels("en", [instagram], ["video"]);
    const photos = await renderChannels("en", [instagram], ["image", "image"]);
    const french = await renderChannels("fr", [instagram], ["video"]);

    for (const label of [
      "Also share to the feed",
      "Cover image",
      "Cover frame, in milliseconds",
      "Audio name",
      "Trial reel",
      "Collaborators",
    ]) {
      expect(reel).toContain(label);
    }

    expect(photos).toContain("Collaborators");
    expect(photos).not.toContain("Trial reel");
    expect(photos).not.toContain("Cover image");

    for (const label of [
      "Partager aussi dans le fil",
      "Image de couverture",
      "Reel d’essai",
      "Collaborateurs",
    ]) {
      expect(french).toContain(label);
    }
  });

  it("say each collaborator is invited, and refuse a fourth", async () => {
    const html = await renderChannels("en", [instagram], [], {
      collaborators: "a.one, b_two, c3, d4",
    });

    const french = await renderChannels("fr", [instagram], []);

    expect(html).toContain("Each account receives an invitation");
    expect(html).toContain("name only accounts you mean to invite");
    expect(html).toContain("4 given: 3 at most.");
    expect(french).toContain("Chaque compte reçoit une invitation");
    expect(french).toContain(
      "ne nommez que des comptes que vous voulez inviter"
    );
  });

  it("show a Facebook video's title on a post with a video only", async () => {
    const video = await renderChannels(
      "en",
      [facebookPage],
      ["image", "video"]
    );

    const images = await renderChannels("en", [facebookPage], ["image"]);
    const french = await renderChannels("fr", [facebookPage], ["video"]);

    expect(video).toContain("Video title");
    expect(images).not.toContain("Synthetic Bakery");
    expect(french).toContain("Titre de la vidéo");
  });

  it("show TikTok's photo fields on photos, and its cover frame on a video", async () => {
    const photos = await renderChannels("en", [tiktok], ["image", "image"]);
    const video = await renderChannels("en", [tiktok], ["video"]);
    const french = await renderChannels("fr", [tiktok], ["image"]);

    expect(tiktokLabelsIn(photos)).toStrictEqual([
      "Photo post title",
      "Cover photo",
      "Add music automatically",
    ]);
    expect(tiktokLabelsIn(video)).toStrictEqual([
      "Cover frame, in milliseconds",
    ]);
    expect(tiktokLabelsIn(french)).toStrictEqual([
      "Titre de la publication photo",
      "Ajouter de la musique automatiquement",
    ]);
  });

  it("show every field while the media are read", async () => {
    const html = await renderChannels("en", [tiktok, instagram], undefined);

    for (const label of [
      "Photo post title",
      "Cover frame, in milliseconds",
      "Trial reel",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("show what the API would refuse in a number field", async () => {
    const html = await renderChannels("en", [instagram], ["video"], {
      thumbOffsetMs: "about two seconds",
    });

    expect(html).toContain(
      "A whole number of milliseconds within the video, such as 1500."
    );
    expect(html).toContain('aria-invalid="true"');
  });
});

const created = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const cover: Media = {
  altText: "A synthetic cover",
  byteSize: 200_000,
  codec: null,
  contentType: "image/jpeg",
  createdAt: created,
  dimensions: { height: 720, width: 1280 },
  durationMs: null,
  id: "019a0000-0000-7000-8000-00000000000c",
  kind: "image",
  pageCount: null,
  status: { _tag: "ready" },
  updatedAt: created,
  url: "https://media.example.test/synthetic-cover.jpg",
};

const thumbnailField = Option.getOrThrow(
  fieldOf("youtube", "thumbnailMediaId")
);

const renderMedia = async (locale: Locale, chosen: ChosenMedia) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      {thumbnailField.kind === "media" ? (
        <MediaOptionView
          chosen={chosen}
          disabled={false}
          field={thumbnailField}
          id="option-thumbnail"
          limits={{}}
          picker={<button type="button">Picker</button>}
          problem={undefined}
          onRemove={() => {
            // Never clicked in a static render.
          }}
        />
      ) : null}
    </NextIntlClientProvider>
  );

describe(MediaOptionView, () => {
  it("shows that nothing is chosen, with the picker and no remove button", async () => {
    const html = await renderMedia("en", { _tag: "none" });
    const french = await renderMedia("fr", { _tag: "none" });

    for (const text of [
      "Thumbnail",
      "No image chosen.",
      "Picker",
      "A JPEG or PNG image of the library",
    ]) {
      expect(html).toContain(text);
    }

    expect(html).not.toContain("Remove");
    expect(french).toContain("Miniature</legend>");
    expect(french).toContain("Aucune image choisie.");
  });

  it("shows the image chosen, and a button to take it away", async () => {
    const html = await renderMedia("en", { _tag: "loaded", media: cover });

    expect(html).toContain("https://media.example.test/synthetic-cover.jpg");
    expect(html).toContain("Remove");
    expect(html).not.toContain("No image chosen.");
  });

  it("says when the image chosen could not be read, and still takes it away", async () => {
    const html = await renderMedia("en", { _tag: "failed" });

    expect(html).toContain("may have been deleted from the library");
    expect(html).toContain("Remove");
  });

  it("shows in the panel the image a YouTube video holds, without a library to pick from", async () => {
    const html = await renderChannels("en", [youtube], ["video"], {
      thumbnailMediaId: cover.id,
    });

    const empty = await renderChannels("en", [youtube], ["video"]);

    expect(html).toContain("Reading the image…");
    expect(html).toContain("Remove");
    expect(empty).toContain("No image chosen.");
    expect(empty).not.toContain("Choose from the library");
  });
});
