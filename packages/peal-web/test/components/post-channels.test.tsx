import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Channel, Post, PostTarget } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { PostChannelsView } from "#components/posts/post-channels.tsx";
import { loadMessages } from "#i18n/messages.ts";

const channel = (id: string, handle: string): Channel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle,
  id,
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const channels = [
  channel("c1", "@notes@social.example"),
  channel("c2", "@field@social.example"),
];

const target = (
  id: string,
  channelId: string,
  fields: Partial<PostTarget> = {}
): PostTarget => ({
  channelId,
  editedAt: null,
  failureReason: null,
  id,
  options: null,
  parts: { count: 1, live: [] },
  permalink: null,
  publishedAt: null,
  removedAt: null,
  round: 1,
  status: "pending",
  unconfirmedReason: null,
  ...fields,
});

const scheduled = (targets: readonly PostTarget[]): Post => ({
  authorId: null,
  content: { media: [], overrides: [], text: "A synthetic post." },
  createdVia: null,
  id: "00000000-0000-7000-8000-000000000001",
  occurrence: null,
  outcome: null,
  queueId: null,
  recyclingId: null,
  schedule: {
    at: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
    timeZone: "Europe/Paris",
  },
  scheduledBy: null,
  scheduledVia: null,
  shortenLinks: false,
  status: "scheduled",
  tagIds: [],
  targets,
});

const render = async (
  locale: Locale,
  post: Post,
  canRemove = true,
  busy: string | null = null
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      <PostChannelsView
        busy={busy}
        canRemove={canRemove}
        channels={channels}
        post={post}
        onRemove={() => {
          // Rendered once: nothing is asked.
        }}
      />
    </NextIntlClientProvider>
  );

describe(PostChannelsView, () => {
  it("offers to take each channel off while two are left", async () => {
    const html = await render(
      "en",
      scheduled([target("t1", "c1"), target("t2", "c2")])
    );

    expect(html).toContain(
      'aria-label="Remove @notes@social.example from the post"'
    );
    expect(html).toContain(
      'aria-label="Remove @field@social.example from the post"'
    );
    expect(html).not.toContain("The last channel it goes to stays");
  });

  it("keeps the last channel, and lists the one taken off", async () => {
    const html = await render(
      "en",
      scheduled([
        target("t1", "c1", { dropped: true, status: "cancelled" }),
        target("t2", "c2"),
      ])
    );

    expect(html).toContain("Taken off the post");
    expect(html).not.toContain("Remove @field@social.example");
    expect(html).toContain("The last channel it goes to stays");
  });

  it("offers nothing to someone who may not change the post, in French too", async () => {
    const post = scheduled([target("t1", "c1"), target("t2", "c2")]);
    const english = await render("en", post, false);
    const french = await render("fr", post);

    expect(english).not.toContain("Remove @");
    expect(french).toContain("Retirer @notes@social.example de la publication");
  });
});
