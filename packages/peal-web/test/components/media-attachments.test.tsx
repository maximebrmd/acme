import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { PostContentInvalid } from "peal-contract";
import type { SocialChannel, Media, Platform } from "peal-contract";
import { maxMediaPerPost } from "peal-contract/post-text";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChannelMediaField } from "#components/posts/channel-media-field.tsx";
import { CharacterCounters } from "#components/posts/character-counters.tsx";
import { ComposerErrors } from "#components/posts/composer-errors.tsx";
import { MediaAttachments } from "#components/posts/media-attachments.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { mediaItem } from "#posts/attached-media.ts";
import { fitOn } from "#posts/character-count.ts";
import { mediaFitOn } from "#posts/media-fit.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";

const workspaceId = "00000000-0000-4000-8000-000000000001";

const created = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const photo: Media = {
  aiGenerated: false,
  altText: null,
  byteSize: 200_000,
  codec: null,
  contentType: "image/gif",
  createdAt: created,
  dimensions: { height: 800, width: 1200 },
  durationMs: null,
  fileName: null,
  id: "00000000-0000-7000-8000-00000000a001",
  kind: "image",
  pageCount: null,
  status: { _tag: "ready" },
  updatedAt: created,
  url: null,
};

const clip: Media = {
  ...photo,
  byteSize: 20_000_000,
  contentType: "video/mp4",
  dimensions: { height: 1920, width: 1080 },
  durationMs: 150_000,
  fileName: null,
  id: "00000000-0000-7000-8000-00000000a002",
  kind: "video",
  pageCount: null,
};

const attached: readonly AttachedMedia[] = [
  {
    altText: "A synthetic chart",
    media: Option.some(photo),
    mediaId: photo.id,
  },
  { altText: "", media: Option.some(clip), mediaId: clip.id },
];

const channel = (platform: Platform): SocialChannel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: `@peal_${platform}`,
  id: `channel-${platform}`,
  label: null,
  platform,
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

// As many photos as a post holds.
const album: readonly Media[] = Array.from(
  { length: maxMediaPerPost },
  (_, index) => ({
    ...photo,
    id: `00000000-0000-7000-8000-00000000b${String(index).padStart(3, "0")}`,
  })
);

// Renders with the media already loaded, so nothing is fetched.
const render = async (locale: Locale, children: ReactNode) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <RegistryProvider
      initialValues={[photo, clip, ...album].map((media) => [
        mediaItem(workspaceId, media.id),
        AsyncResult.success(media),
      ])}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </RegistryProvider>
  );
};

const list = (platforms: readonly Platform[], disabled = false) => (
  <MediaAttachments
    attached={attached}
    canBrowse
    canUpload={false}
    disabled={disabled}
    platforms={platforms}
    workspaceId={workspaceId}
    onChange={() => {
      // Rendered once: nothing changes.
    }}
  />
);

// The file input of the uploader, if the section shows one.
const fileInput = (html: string) =>
  /<input[^>]*type="file"[^>]*>/u.exec(html)?.at(0);

const uploading = ({
  disabled,
  editable,
  media = attached,
}: {
  readonly disabled: boolean;
  readonly editable: boolean;
  readonly media?: readonly AttachedMedia[];
}) => (
  <MediaAttachments
    attached={media}
    canBrowse
    canUpload
    disabled={disabled}
    editable={editable}
    platforms={["mastodon"]}
    workspaceId={workspaceId}
    onChange={() => {
      // Rendered once: nothing changes.
    }}
  />
);

describe(MediaAttachments, () => {
  it("lists each attachment with its alt text, named by place", async () => {
    const html = await render("en", list(["mastodon"]));

    expect(html).toContain("2 images or videos, at most 20.");
    expect(html).toContain("Alt text for image 1");
    expect(html).toContain("Alt text for video 2");
    expect(html).toContain("Choose from the library");
  });

  it("names each button by the attachment it moves or removes", async () => {
    const html = await render("en", list(["mastodon"]));

    expect(html).toContain('aria-label="Move image 1 earlier"');
    expect(html).toContain('aria-label="Move video 2 later"');
    expect(html).toContain('aria-label="Remove video 2 from the post"');
  });

  it("warns where a platform the post goes to shows alt text", async () => {
    const shown = await render("en", list(["mastodon", "bluesky", "x"]));

    expect(shown).toContain(
      "No alt text yet: Mastodon, Bluesky, and X show it to people who cannot see the video."
    );

    const one = await render("en", list(["tiktok", "mastodon"]));

    expect(one).toContain("Mastodon shows it to people");

    // Instagram shows alt text too.
    const instagram = await render("en", list(["instagram"]));

    expect(instagram).toContain("Instagram shows it to people");

    const none = await render("en", list(["tiktok"]));

    expect(none).toContain("No alt text yet. Write one so that everyone");
  });

  it("only shows a post that can no longer change", async () => {
    const html = await render("en", list(["mastodon"], true));

    expect(html).not.toContain("Move image 1 earlier");
    expect(html).not.toContain("Choose from the library");
    expect(html).toMatch(/<textarea[^>]*disabled/u);
  });

  it("keeps the uploader while the draft is saved, so its files go on", async () => {
    const open = await render(
      "en",
      uploading({ disabled: false, editable: true })
    );

    expect(fileInput(open)).toBeDefined();
    expect(fileInput(open)).not.toContain('disabled=""');

    // Saving disables the section for a moment: taking the uploader off
    // the page would cancel the files it is still sending.
    const saving = await render(
      "en",
      uploading({ disabled: true, editable: true })
    );

    expect(fileInput(saving)).toContain('disabled=""');

    const scheduled = await render(
      "en",
      uploading({ disabled: true, editable: false })
    );

    expect(fileInput(scheduled)).toBeUndefined();
  });

  it("keeps the uploader once the post is full, taking no new file", async () => {
    const full = await render(
      "en",
      uploading({
        disabled: false,
        editable: true,
        media: album.map((media) => ({
          altText: "A synthetic photo",
          media: Option.some(media),
          mediaId: media.id,
        })),
      })
    );

    expect(full).toContain("20 images or videos, at most 20.");
    expect(fileInput(full)).toContain('disabled=""');
  });

  it("speaks the reader's language", async () => {
    const html = await render("fr", list(["mastodon"]));

    expect(html).toContain("Texte alternatif de la vidéo 2");
    expect(html).toContain(
      "Pas encore de texte alternatif : Mastodon le montre"
    );
  });
});

describe("the media checks beside the counters", () => {
  it("name what each channel's platform would refuse", async () => {
    const html = await render(
      "en",
      <CharacterCounters
        fits={(["x", "instagram"] as const).map((platform) => ({
          channel: channel(platform),
          fit: fitOn(platform, "A synthetic post", attached.length),
          media: mediaFitOn(platform, attached),
        }))}
      />
    );

    expect(html).toContain("Video 2: over 140 sec");
    expect(html).toContain("No images with a video");
    expect(html).toContain("Image 1: GIF not taken");
    expect(html).toContain("1 without alt text");
    expect(html).toContain("2 channels would refuse the post as it is.");
  });

  it("speak the reader's language", async () => {
    const tall = {
      ...photo,
      contentType: "image/jpeg",
      dimensions: { height: 4000, width: 1000 },
    } satisfies Media;

    const html = await render(
      "fr",
      <CharacterCounters
        fits={[
          {
            channel: channel("instagram"),
            fit: fitOn("instagram", "Une publication synthétique", 2),
            media: mediaFitOn("instagram", [
              ...attached.slice(0, 1),
              { altText: "", media: Option.some(tall), mediaId: "tall" },
            ]),
          },
        ]}
      />
    );

    expect(html).toMatch(/Image 1\s:\sGIF non accepté/u);
    expect(html).toMatch(/Image 2\s:\sproportions non acceptées/u);
  });
});

describe("the media violations the API reports", () => {
  it("name the channel and the image or video", async () => {
    const html = await render(
      "en",
      <ComposerErrors
        channels={[channel("x")]}
        media={attached}
        failure={
          new PostContentInvalid({
            violations: [
              {
                _tag: "videoTooLong",
                channelId: "channel-x",
                durationMs: 150_000,
                maximumMs: 140_000,
                mediaId: clip.id,
                platform: "x",
              },
              {
                _tag: "mediaTooLarge",
                byteSize: 6_000_000,
                channelId: "channel-x",
                maximum: 5_242_880,
                mediaId: "00000000-0000-7000-8000-00000000a0ff",
                platform: "x",
              },
              { _tag: "mixedMedia", channelId: "channel-x", platform: "x" },
            ],
          })
        }
      />
    );

    expect(html).toContain(
      "@peal_x on X: video 2 lasts 150 sec, at most 140 sec."
    );
    expect(html).toContain(
      "@peal_x on X: an image or a video weighs 5.7 MB, at most 5 MB."
    );
    expect(html).toContain(
      "@peal_x on X: images and a video cannot go out together."
    );
  });

  it("say a file is smaller than the platform takes, in each language", async () => {
    const view = (
      <ComposerErrors
        channels={[channel("linkedin")]}
        media={attached}
        failure={
          new PostContentInvalid({
            violations: [
              {
                _tag: "mediaTooSmall",
                byteSize: 40_960,
                channelId: "channel-linkedin",
                mediaId: clip.id,
                minimum: 75_000,
                platform: "linkedin",
              },
            ],
          })
        }
      />
    );

    await expect(render("en", view)).resolves.toContain(
      "@peal_linkedin on LinkedIn: video 2 weighs 40 kB, at least 73.2 kB."
    );
    // French puts no-break spaces before a colon and a unit.
    const french = await render("fr", view);

    expect(french.replaceAll(/\s/gu, " ")).toContain(
      "@peal_linkedin sur LinkedIn : la vidéo 2 pèse 40 ko, 73,2 ko au moins."
    );
  });
});

const ownMedia = ({
  own,
  waitingForText = false,
}: {
  readonly own: readonly AttachedMedia[] | undefined;
  readonly waitingForText?: boolean;
}) => (
  <ChannelMediaField
    canBrowse
    canGenerate={false}
    canUpload={false}
    channel={channel("bluesky")}
    disabled={false}
    editable
    own={own}
    platforms={["bluesky"]}
    postMedia={[]}
    waitingForText={waitingForText}
    workspaceId={workspaceId}
    onChange={() => {
      // Rendered once: nothing changes.
    }}
  />
);

describe(ChannelMediaField, () => {
  it("offers a channel media of its own, off while it shows the post's", async () => {
    const html = await render("en", ownMedia({ own: undefined }));

    expect(html).toContain("Images and videos of its own on @peal_bluesky");
    expect(html).toContain("Off, it shows the post&#x27;s images and videos.");
    expect(html).not.toContain("Alt text for image 1");
  });

  it("lists the channel's own media under a name of its own", async () => {
    const html = await render("en", ownMedia({ own: attached }));

    expect(html).toContain('aria-label="Images and videos on @peal_bluesky"');
    expect(html).toContain("Alt text for image 1");
    expect(html).toContain("It shows these instead of the post");
  });

  it("says its media wait for a text, in French too", async () => {
    const english = await render(
      "en",
      ownMedia({ own: attached, waitingForText: true })
    );

    const french = await render(
      "fr",
      ownMedia({ own: attached, waitingForText: true })
    );

    expect(english).toContain("Write a text for this channel");
    expect(french).toContain("Écrivez un texte pour ce canal");
    expect(french).toContain("Images et vidéos propres sur @peal_bluesky");
  });
});
