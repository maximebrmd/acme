import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Channel, Post } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PostItemView,
  PostListEmpty,
  PostListFiltersView,
  usePostTitle,
} from "#components/posts/post-list-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { noFilters } from "#posts/post-list-filter.ts";

const channel: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: "@notes@social.example",
  id: "00000000-0000-7000-8000-00000000c001",
  label: "Field Notes",
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const post = (changes: Partial<Post>): Post => ({
  authorId: null,
  content: { media: [], overrides: [], text: "Launch day, the notes" },
  createdVia: null,
  id: "00000000-0000-7000-8000-000000000001",
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
      channelId: channel.id,
      editedAt: null,
      failureReason: null,
      id: "00000000-0000-7000-8000-00000000f001",
      options: null,
      parts: { count: 1, live: [] },
      permalink: null,
      publishedAt: null,
      removedAt: null,
      round: 1,
      status: "pending",
      unconfirmedReason: null,
    },
    {
      channelId: "00000000-0000-7000-8000-00000000c0ff",
      editedAt: null,
      failureReason: null,
      id: "00000000-0000-7000-8000-00000000f002",
      options: null,
      parts: { count: 1, live: [] },
      permalink: null,
      publishedAt: null,
      removedAt: null,
      round: 1,
      status: "pending",
      unconfirmedReason: null,
    },
  ],
  ...changes,
});

const render = async (locale: Locale, node: ReactNode) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Europe/Paris"
    >
      {node}
    </NextIntlClientProvider>
  );
};

const Item = ({ item }: { readonly item: Post }) => (
  <PostItemView channels={[channel]} post={item}>
    <a dir="auto" href={`/posts/${item.id}`}>
      {usePostTitle(item)}
    </a>
  </PostItemView>
);

describe(PostItemView, () => {
  it("links a post by its first words, with its status and its channels", async () => {
    const html = await render("en", <Item item={post({})} />);

    expect(html).toContain(
      '<a dir="auto" href="/posts/00000000-0000-7000-8000-000000000001">Launch day, the notes</a>'
    );
    expect(html).toContain("Draft");
    expect(html).toContain("No time yet");
    expect(html).toContain(
      "Field Notes (@notes@social.example) · A disconnected channel"
    );
  });

  it("names no channel taken off the post", async () => {
    const shown = post({ status: "scheduled" });
    const [kept, removed] = shown.targets;

    const html = await render(
      "en",
      <Item
        item={{
          ...shown,
          targets: [
            ...(kept === undefined ? [] : [kept]),
            ...(removed === undefined
              ? []
              : [{ ...removed, dropped: true, status: "cancelled" as const }]),
          ],
        }}
      />
    );

    expect(html).toContain("Field Notes (@notes@social.example)");
    expect(html).not.toContain("A disconnected channel");
  });

  it("shows a failed post's time in the reader's zone, and its outcome", async () => {
    const html = await render(
      "en",
      <Item
        item={post({
          outcome: "failed",
          schedule: {
            at: DateTime.makeUnsafe("2026-11-12T09:30:00Z"),
            timeZone: "UTC",
          },
          status: "finished",
        })}
      />
    );

    expect(html).toContain("Nov 12, 2026, 10:30");
    expect(html).toContain("Finished");
    expect(html).toContain("Failed");
  });

  it("names a post without text, in the reader's language", async () => {
    const html = await render(
      "fr",
      <Item item={post({ content: { media: [], overrides: [], text: " " } })} />
    );

    expect(html).toContain("Pas encore de texte");
    expect(html).toContain("Brouillon");
  });
});

describe(PostListEmpty, () => {
  it("says there is no post yet", async () => {
    await expect(
      render("en", <PostListEmpty clearFilters={null} filtering={false} />)
    ).resolves.toContain("No post yet.");
  });

  it("says the filters keep nothing, and offers to clear them", async () => {
    const html = await render(
      "en",
      <PostListEmpty
        clearFilters={
          <a href="https://app.example.test/posts">Clear the filters</a>
        }
        filtering
      />
    );

    expect(html).toContain("No post matches these filters.");
    expect(html).toContain(
      '<a href="https://app.example.test/posts">Clear the filters</a>'
    );
  });
});

const renderFilters = async (
  shown: Parameters<typeof PostListFiltersView>[0]["filters"]
) =>
  await render(
    "en",
    <PostListFiltersView
      channels={[channel]}
      filters={shown}
      tags={[]}
      onChange={() => {
        // Nothing changes in a render.
      }}
    />
  );

describe(PostListFiltersView, () => {
  it("offers the outcome only with the finished posts", async () => {
    await expect(renderFilters(noFilters)).resolves.not.toContain(
      "Every outcome"
    );
    await expect(
      renderFilters({ ...noFilters, status: "finished" })
    ).resolves.toContain("Every outcome");
  });

  it("says when it filters by a channel the workspace no longer has", async () => {
    const html = await renderFilters({
      ...noFilters,
      channelId: "00000000-0000-7000-8000-00000000c0ff",
    });

    expect(html).toContain("A channel no longer connected");
    expect(html).not.toContain("Every channel");
  });

  it("says that ordering by time leaves out the posts without one", async () => {
    await expect(renderFilters(noFilters)).resolves.not.toContain(
      "only the posts that have one"
    );
    await expect(
      renderFilters({ ...noFilters, sort: "scheduledAsc" })
    ).resolves.toContain("only the posts that have one");
  });
});
