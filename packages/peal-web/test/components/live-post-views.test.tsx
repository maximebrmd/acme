import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Channel, Post } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { LivePostView } from "#components/posts/live/live-post-views.tsx";
import { PostDetailView } from "#components/posts/post-detail.tsx";
import { loadMessages } from "#i18n/messages.ts";
import type { LiveState } from "#posts/live-post.ts";

// What a member who may unpublish sees of a live post on a channel, in
// each state, and the channel's card once it was removed.

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const renderState = async (locale: "en" | "fr", state: LiveState) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <LivePostView
        busy={false}
        channelName="Notes (@notes@social.example)"
        platform="Threads"
        state={state}
        onUnpublish={() => {
          // Nothing is asked while rendering to markup.
        }}
      />
    </NextIntlClientProvider>
  );

const channel: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: "@notes@social.example",
  id: "c1",
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const removed: Post = {
  authorId: null,
  content: { media: [], overrides: [], text: "Our field note." },
  createdVia: null,
  id: "00000000-0000-7000-8000-000000000001",
  occurrence: null,
  outcome: "published",
  queueId: null,
  recyclingId: null,
  schedule: { at: utc("2026-06-15T08:00:00Z"), timeZone: "Europe/Paris" },
  scheduledBy: null,
  scheduledVia: null,
  status: "finished",
  tagIds: [],
  targets: [
    {
      channelId: "c1",
      failureReason: null,
      id: "t1",
      options: null,
      parts: { count: 1, live: [] },
      permalink: "https://social.example/@notes/1",
      publishedAt: utc("2026-06-15T08:00:02Z"),
      removedAt: utc("2026-06-16T10:00:00Z"),
      round: 1,
      status: "published",
      unconfirmedReason: null,
    },
  ],
};

describe("unpublishing a live post", () => {
  it("offers the action, which asks first", async () => {
    await expect(renderState("en", { _tag: "offered" })).resolves.toContain(
      "Unpublish"
    );
    await expect(renderState("fr", { _tag: "offered" })).resolves.toContain(
      "Dépublier"
    );
  });

  it("says a removal runs, and one that failed, with a way to ask again", async () => {
    await expect(renderState("en", { _tag: "removing" })).resolves.toContain(
      "Removing…"
    );

    const failed = await renderState("fr", {
      _tag: "failed",
      code: "unavailable",
    });

    expect(failed).toContain("La suppression a échoué (unavailable)");
    expect(failed).toContain("Réessayer");
  });

  it("says why a platform does not let Peal delete", async () => {
    await expect(
      renderState("en", { _tag: "blocked", by: "permission" })
    ).resolves.toContain("Threads does not let Peal delete posts yet.");
    await expect(renderState("en", { _tag: "none" })).resolves.toBe("");
  });

  it("shows a removed post's card with when, its address struck through", async () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en"
        messages={await loadMessages("en")}
        timeZone="UTC"
      >
        <PostDetailView
          attempts={[]}
          busy={null}
          canAct
          channels={[channel]}
          post={removed}
          viewerId={null}
          onRequest={() => {
            // Nothing is asked while rendering to markup.
          }}
        />
      </NextIntlClientProvider>
    );

    expect(markup).toContain("Removed from Mastodon on Jun 16, 2026");
    expect(markup).toContain("line-through");
  });
});
