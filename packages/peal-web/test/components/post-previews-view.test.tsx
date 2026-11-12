import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Channel, ChannelPreview } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { PostPreviewsView } from "#components/posts/post-previews-view.tsx";
import type { PreviewAnswer } from "#components/posts/post-previews-view.tsx";
import { loadMessages } from "#i18n/messages.ts";
import type { PreviewState } from "#posts/post-preview.ts";

const channel: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: "@notes@social.example",
  id: "00000000-0000-7000-8000-00000000c001",
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const none = { count: 0, maximum: null };

const preview = (changes: Partial<ChannelPreview>): ChannelPreview => ({
  channelId: channel.id,
  hashtags: none,
  links: none,
  media: none,
  mentions: none,
  parts: [],
  platform: "mastodon",
  text: "مرحبا\nLaunch day",
  textCounts: [{ length: 600, maximum: 500, unit: "codePoints" }],
  violations: [],
  ...changes,
});

const render = async (
  locale: Locale,
  state: PreviewState<PreviewAnswer>,
  { selected = 1, shortenLinks = false, waiting = false } = {}
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <PostPreviewsView
        channels={[channel]}
        media={[]}
        parts={[]}
        selected={selected}
        shortenLinks={shortenLinks}
        state={state}
        waitingForOptions={waiting}
        onRetry={() => {
          // Nothing to ask in a render.
        }}
      />
    </NextIntlClientProvider>
  );
};

const shown = (
  channels: readonly ChannelPreview[],
  status: PreviewState<PreviewAnswer>["status"] = "shown"
): PreviewState<PreviewAnswer> => ({
  asked: "one",
  latest: 1,
  shown: { channels },
  status,
});

describe(PostPreviewsView, () => {
  it("asks for a channel while none is chosen", async () => {
    await expect(
      render(
        "en",
        { asked: null, latest: 0, shown: null, status: "idle" },
        { selected: 0 }
      )
    ).resolves.toContain("Pick a channel to see what it will receive.");
  });

  it("shows each channel's text as text, in its direction, with its counts", async () => {
    const html = await render("en", shown([preview({})]));

    expect(html).toContain("@notes@social.example");
    expect(html).toContain("Mastodon");
    expect(html).toContain('<p dir="auto"');
    expect(html).toContain("مرحبا\nLaunch day");
  });

  it("counts the text as the platform does, and says it lays it out", async () => {
    const html = await render("en", shown([preview({})]));

    expect(html).toContain("600 of 500 characters");
    expect(html).toContain("Each platform lays the post out its own way.");
  });

  it("marks a channel that would be refused, and points up", async () => {
    const html = await render(
      "en",
      shown([preview({ violations: [{ _tag: "noChannels" }] })])
    );

    expect(html).toContain("Would be refused as it is");
  });

  it("lists the parts that follow, each named by its place", async () => {
    const html = await render(
      "fr",
      shown([
        preview({
          parts: [
            {
              hashtags: none,
              links: none,
              media: none,
              mentions: none,
              part: 1,
              text: "La suite",
              textCounts: [],
            },
          ],
        }),
      ])
    );

    expect(html).toContain("Partie 2");
    expect(html).toContain("La suite");
  });

  it("dims the last preview while a newer one is asked", async () => {
    const html = await render("en", shown([preview({})], "loading"));

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("opacity-60");
  });

  it("says a failure, with a way to try again, and keeps the last preview", async () => {
    const html = await render("en", shown([preview({})], "failed"));

    expect(html).toContain("The previews could not be updated.");
    expect(html).toContain("Try again");
    expect(html).toContain("Launch day");
  });

  it("shows nothing to a member who may not read what a check needs", async () => {
    await expect(
      render("en", {
        asked: "one",
        latest: 1,
        shown: null,
        status: "forbidden",
      })
    ).resolves.toBe("");
  });

  it("dims the last preview, and says why, while an option is refused", async () => {
    const html = await render("en", shown([preview({})]), { waiting: true });

    expect(html).toContain(
      "The previews wait until the options below are fixed."
    );
    expect(html).toContain("opacity-60");
  });

  it("says links are shortened only when the post goes out", async () => {
    await expect(
      render("en", shown([preview({})]), { shortenLinks: true })
    ).resolves.toContain("they are shortened when the post goes out");
  });
});
