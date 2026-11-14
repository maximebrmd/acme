import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { MediaUsage } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { MediaUsageNotice } from "#components/media/media-usage-notice.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", usage: MediaUsage) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <MediaUsageNotice
        usage={usage}
        // The app links through next-intl's Link, which needs Next to run.
        postLinks={usage.scheduled.map((postId, index) => (
          <a key={postId} href={`/posts/${postId}`}>
            {`Open scheduled post ${index + 1}`}
          </a>
        ))}
      />
    </NextIntlClientProvider>
  );
};

describe(MediaUsageNotice, () => {
  it("lists the scheduled posts that keep the media from going", async () => {
    const html = await render("en", {
      draftArticles: [],
      drafts: ["d1"],
      scheduled: ["p1", "p2"],
      scheduledArticles: [],
    });

    expect(html).toContain(
      "2 scheduled posts show it. Take them back to draft and remove it first, or wait until they have gone out."
    );
    expect(html).toContain('<a href="/posts/p1">Open scheduled post 1</a>');
    expect(html).toContain('<a href="/posts/p2">Open scheduled post 2</a>');
    // The refusal says it all: drafts are not mentioned.
    expect(html).not.toContain("draft shows it");
  });

  it("warns that drafts lose the media", async () => {
    await expect(
      render("en", {
        draftArticles: [],
        drafts: ["d1"],
        scheduled: [],
        scheduledArticles: [],
      })
    ).resolves.toContain("A draft shows it, and will lose it.");
    await expect(
      render("fr", {
        draftArticles: [],
        drafts: ["d1", "d2"],
        scheduled: [],
        scheduledArticles: [],
      })
    ).resolves.toContain("2 brouillons l’utilisent, et le perdront.");
  });

  it("says nothing when no post shows it", async () => {
    await expect(
      render("en", {
        draftArticles: [],
        drafts: [],
        scheduled: [],
        scheduledArticles: [],
      })
    ).resolves.toBe("");
  });

  it("says a scheduled article keeps the media, and warns of a draft's", async () => {
    await expect(
      render("en", {
        draftArticles: [],
        drafts: [],
        scheduled: [],
        scheduledArticles: ["a1"],
      })
    ).resolves.toContain(
      "A scheduled article shows it. Take it back to draft and remove it first, or wait until it has gone out."
    );
    await expect(
      render("fr", {
        draftArticles: ["a1", "a2"],
        drafts: [],
        scheduled: [],
        scheduledArticles: [],
      })
    ).resolves.toContain(
      "2 articles pas encore sur leur site l’utilisent, et la perdront."
    );
  });
});
