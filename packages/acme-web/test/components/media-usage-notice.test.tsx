import { describe, expect, it } from "@effect/vitest";
import type { MediaUsage } from "acme-contract";
import { NextIntlClientProvider } from "next-intl";
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
      drafts: ["d1"],
      scheduled: ["p1", "p2"],
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
      render("en", { drafts: ["d1"], scheduled: [] })
    ).resolves.toContain("A draft shows it, and will lose it.");
    await expect(
      render("fr", { drafts: ["d1", "d2"], scheduled: [] })
    ).resolves.toContain("2 brouillons l’utilisent, et le perdront.");
  });

  it("says nothing when no post shows it", async () => {
    await expect(render("en", { drafts: [], scheduled: [] })).resolves.toBe("");
  });
});
