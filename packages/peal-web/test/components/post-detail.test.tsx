import { describe, expect, it } from "@effect/vitest";
import type {
  Channel,
  Post,
  PostTarget,
  PublicationAttempt,
} from "acme-contract";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { PostDetailView } from "#components/posts/post-detail.tsx";
import { loadMessages } from "#i18n/messages.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const channel = (id: string, handle: string): Channel => ({
  avatarUrl: null,
  displayName: null,
  handle,
  id,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const channels = [
  channel("c1", "@notes@social.example"),
  channel("c2", "@field@social.example"),
  channel("c3", "@live@social.example"),
];

const target = (
  id: string,
  channelId: string,
  fields: Partial<PostTarget>
): PostTarget => ({
  channelId,
  failureReason: null,
  id,
  options: null,
  permalink: null,
  publishedAt: null,
  round: 1,
  status: "pending",
  unconfirmedReason: null,
  ...fields,
});

const post: Post = {
  authorId: null,
  content: { media: [], overrides: [], text: "Our field note." },
  id: "00000000-0000-7000-8000-000000000001",
  outcome: "unconfirmed",
  schedule: { at: utc("2026-06-15T08:00:00Z"), timeZone: "Europe/Paris" },
  status: "finished",
  targets: [
    target("t1", "c1", {
      failureReason: "channelDisconnected",
      status: "failed",
    }),
    target("t2", "c2", {
      status: "unconfirmed",
      unconfirmedReason: "noResponse",
    }),
    target("t3", "c3", {
      permalink: "https://social.example/@live/1",
      publishedAt: utc("2026-06-15T08:00:02Z"),
      round: 2,
      status: "published",
    }),
  ],
};

const attempts: readonly PublicationAttempt[] = [
  {
    attempt: 1,
    finishedAt: utc("2026-06-15T08:00:01Z"),
    result: "rateLimited",
    retryAt: utc("2026-06-15T08:01:01Z"),
    round: 1,
    startedAt: utc("2026-06-15T08:00:00Z"),
    targetId: "t1",
  },
  {
    attempt: 2,
    finishedAt: utc("2026-06-15T08:01:02Z"),
    result: "channelDisconnected",
    retryAt: null,
    round: 1,
    startedAt: utc("2026-06-15T08:01:01Z"),
    targetId: "t1",
  },
  {
    attempt: 1,
    finishedAt: utc("2026-06-15T09:00:02Z"),
    result: "published",
    retryAt: null,
    round: 2,
    startedAt: utc("2026-06-15T09:00:00Z"),
    targetId: "t3",
  },
];

const render = async (locale: "en" | "fr", canAct: boolean) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <PostDetailView
        attempts={attempts}
        busy={null}
        canAct={canAct}
        channels={channels}
        post={post}
        onRequest={() => {
          // Nothing is asked while rendering to markup.
        }}
      />
    </NextIntlClientProvider>
  );
};

const renderPost = async (locale: "en" | "fr", shown: Post) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <PostDetailView
        attempts={[]}
        busy={null}
        canAct
        channels={[channel("c4", "@acmeexample")]}
        post={shown}
        onRequest={() => {
          // Nothing is asked while rendering to markup.
        }}
      />
    </NextIntlClientProvider>
  );

describe(PostDetailView, () => {
  it("tells a video YouTube kept private, and why the quota stopped one", async () => {
    const shown: Post = {
      ...post,
      targets: [
        target("t4", "c4", {
          keptPrivate: true,
          permalink: "https://www.youtube.com/watch?v=synthetic01",
          publishedAt: utc("2026-06-15T08:00:02Z"),
          status: "published",
        }),
        target("t5", "c4", {
          failureReason: "quotaExceeded",
          status: "failed",
        }),
      ],
    };

    const english = await renderPost("en", shown);
    const french = await renderPost("fr", shown);

    expect(english).toContain("YouTube made the video private");
    expect(english).toContain("daily allowance of uploads stayed used up");
    expect(french).toContain("YouTube a rendu la vidéo privée");
  });

  it("says how the post went on each channel, and why", async () => {
    const html = await render("en", true);

    expect(html).toContain("Scheduled for Jun 15, 2026 at 8:00 AM");
    expect(html).toContain(
      "It did not go out: its channel was disconnected from the workspace before it went out."
    );
    expect(html).not.toContain("the platform refused its text");
    expect(html).toContain(
      "Acme cannot tell whether it went out: the platform did not answer. Check Mastodon before you post it again, then say what you found."
    );
  });

  it("links a published post, and counts its sends", async () => {
    const html = await render("en", true);

    expect(html).toContain("Live since Jun 15, 2026 at 8:00 AM.");
    expect(html).toContain('href="https://social.example/@live/1"');
    expect(html).toContain("Sent 2 times");
  });

  it("lists each channel's attempts, with when the next one was due", async () => {
    const html = await render("en", true);

    expect(html).toContain(
      "Attempt 1, Jun 15, 2026 at 8:00 AM: the platform asked Acme to wait"
    );
    expect(html).toContain("Tried again at 8:01 AM.");
    expect(html).toContain(
      "Attempt 2, Jun 15, 2026 at 8:01 AM: the channel was disconnected"
    );
    expect(html).toContain(
      "Send 2, attempt 1, Jun 15, 2026 at 9:00 AM: published"
    );
  });

  it("offers to repost or check only to those who schedule posts", async () => {
    const acting = await render("en", true);
    const reading = await render("en", false);

    // Failed and unconfirmed: two reposts, one check.
    expect(acting.match(/>Post again</gu)).toHaveLength(2);
    expect(acting).toContain(">Say what you found<");
    expect(reading).not.toContain("Post again");
    expect(reading).not.toContain("Say what you found");
  });

  it("writes it all in French", async () => {
    const html = await render("fr", true);

    expect(html).toContain(
      "Elle n’est pas partie : son canal a été déconnecté de l’espace de travail avant son départ."
    );
    expect(html).toContain(
      "Tentative 1, le 15 juin 2026 à 08:00 : la plateforme a demandé à Acme d’attendre"
    );
    expect(html).toContain(">Republier<");
  });
});
