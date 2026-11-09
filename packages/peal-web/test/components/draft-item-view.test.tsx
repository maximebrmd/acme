import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Post } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DraftItemView,
  useDraftTitle,
} from "#components/posts/draft-item-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const draft = (text: string, channels: number, media: number): Post => ({
  authorId: null,
  content: {
    media: Array.from({ length: media }, (_, index) => ({
      altText: "",
      mediaId: `00000000-0000-7000-8000-00000000a00${index}`,
    })),
    overrides: [],
    text,
  },
  id: "00000000-0000-7000-8000-000000000001",
  outcome: null,
  schedule: null,
  status: "draft",
  targets: Array.from({ length: channels }, (_, index) => ({
    channelId: `00000000-0000-7000-8000-00000000c00${index}`,
    failureReason: null,
    id: `00000000-0000-7000-8000-00000000f00${index}`,
    options: null,
    permalink: null,
    publishedAt: null,
    round: 1,
    status: "pending",
    unconfirmedReason: null,
  })),
});

const Draft = ({ post }: { readonly post: Post }) => (
  <DraftItemView post={post}>
    <a href={`/drafts/${post.id}`}>{useDraftTitle(post)}</a>
  </DraftItemView>
);

const render = async (locale: "en" | "fr", post: Post) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <Draft post={post} />
    </NextIntlClientProvider>
  );
};

describe(DraftItemView, () => {
  it("links the draft by its text, and says where it goes", async () => {
    const html = await render("en", draft("  Field notes, part two  ", 2, 1));

    expect(html).toContain(
      '<a href="/drafts/00000000-0000-7000-8000-000000000001">Field notes, part two</a>'
    );
    expect(html).toContain("2 channels · 1 image or video");
  });

  it("names a draft without text, in the reader's language", async () => {
    await expect(render("en", draft("", 0, 0))).resolves.toContain(
      "No text yet"
    );
    await expect(render("fr", draft("", 0, 3))).resolves.toContain(
      "Aucun canal pour l’instant · 3 images ou vidéos"
    );
  });
});
