import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type {
  Channel,
  Post,
  PostTarget,
  PublicationAttempt,
} from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { PostDetailView } from "#components/posts/post-detail.tsx";
import { loadMessages } from "#i18n/messages.ts";

const utc = (iso: string) => DateTime.makeUnsafe(iso);

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
  parts: { count: 1, live: [] },
  permalink: null,
  publishedAt: null,
  removedAt: null,
  round: 1,
  status: "pending",
  unconfirmedReason: null,
  ...fields,
});

const post: Post = {
  authorId: null,
  content: { media: [], overrides: [], text: "Our field note." },
  createdVia: null,
  id: "00000000-0000-7000-8000-000000000001",
  outcome: "unconfirmed",
  queueId: null,
  schedule: { at: utc("2026-06-15T08:00:00Z"), timeZone: "Europe/Paris" },
  scheduledBy: null,
  scheduledVia: null,
  status: "finished",
  tagIds: [],
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
    part: 0,
    refusalCode: null,
    result: "rateLimited",
    retryAt: utc("2026-06-15T08:01:01Z"),
    round: 1,
    startedAt: utc("2026-06-15T08:00:00Z"),
    targetId: "t1",
  },
  {
    attempt: 2,
    finishedAt: utc("2026-06-15T08:01:02Z"),
    part: 0,
    refusalCode: "channelDisconnected",
    result: "channelDisconnected",
    retryAt: null,
    round: 1,
    startedAt: utc("2026-06-15T08:01:01Z"),
    targetId: "t1",
  },
  {
    attempt: 1,
    finishedAt: utc("2026-06-15T09:00:02Z"),
    part: 0,
    refusalCode: null,
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
        viewerId={null}
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
        channels={[channel("c4", "@pealexample")]}
        post={shown}
        viewerId={null}
        onRequest={() => {
          // Nothing is asked while rendering to markup.
        }}
      />
    </NextIntlClientProvider>
  );

// A thread of three parts that stopped at its third.
const thread: Post = {
  ...post,
  content: {
    followUps: [
      { delaySeconds: 0, media: [], overrides: [], text: "A second part." },
      { delaySeconds: 300, media: [], overrides: [], text: "A third part." },
    ],
    media: [],
    overrides: [],
    text: "A first part.",
  },
  outcome: "partiallyPublished",
  targets: [
    target("t4", "c4", {
      failureReason: "contentRejected",
      parts: {
        count: 3,
        live: [
          {
            index: 0,
            permalink: "https://social.example/@live/10",
            platformPostId: "10",
            publishedAt: utc("2026-06-15T08:00:02Z"),
          },
          {
            index: 1,
            permalink: null,
            platformPostId: null,
            publishedAt: utc("2026-06-15T08:00:04Z"),
          },
        ],
      },
      status: "failed",
    }),
  ],
};

describe(PostDetailView, () => {
  it("shows a thread's parts, which are live, and where it stopped", async () => {
    const html = await renderPost("en", thread);

    expect(html).toContain("A third part.");
    expect(html).toContain("2 of 3 parts are live.");
    expect(html).toContain('href="https://social.example/@live/10"');
    expect(html).toContain("Part 2: live");
    expect(html).toContain("Part 3: not sent");
  });

  it("says a repost sends the rest of a thread, in the reader's language", async () => {
    await expect(renderPost("en", thread)).resolves.toContain(
      "Sending it again sends the parts that are not out, never one that is live."
    );

    const french = await renderPost("fr", thread);

    expect(french).toContain("2 parties en ligne sur 3.");
    expect(french).toContain("Partie 3 : non envoyée");
  });

  it("says nothing of parts for a post alone", async () => {
    const html = await render("en", true);

    expect(html).not.toContain("parts are live");
  });

  it("tells a video YouTube kept private, and why the quota stopped one", async () => {
    const shown: Post = {
      ...post,
      tagIds: [],
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

  it("shows a published story's format, with no link to it", async () => {
    const shown: Post = {
      ...post,
      tagIds: [],
      targets: [
        target("t6", "c3", {
          options: { format: "story", platform: "instagram" },
          permalink: "https://social.example/stories/synthetic",
          publishedAt: utc("2026-06-15T08:00:02Z"),
          status: "published",
        }),
      ],
    };

    const english = await renderPost("en", shown);
    const french = await renderPost("fr", shown);

    expect(english).toContain("Story");
    expect(english).toContain("Stories disappear after 24 hours");
    expect(english).not.toContain("https://social.example/stories/synthetic");
    expect(french).toContain("Les stories disparaissent après 24 heures");
  });

  it("tells a video YouTube went live with without its thumbnail", async () => {
    const shown: Post = {
      ...post,
      tagIds: [],
      targets: [
        target("t4", "c4", {
          permalink: "https://www.youtube.com/watch?v=synthetic01",
          publishedAt: utc("2026-06-15T08:00:02Z"),
          status: "published",
          thumbnailNotSet: true,
        }),
      ],
    };

    const english = await renderPost("en", shown);
    const french = await renderPost("fr", shown);
    const plain = await renderPost("en", { ...post, tagIds: [] });

    expect(english).toContain(
      "The thumbnail was not set: the channel may not be allowed custom thumbnails, or YouTube refused the image."
    );
    expect(french).toContain("La miniature n’a pas été définie");
    expect(plain).not.toContain("The thumbnail was not set");
  });

  it("says how the post went on each channel, and why", async () => {
    const html = await render("en", true);

    expect(html).toContain("Scheduled for Jun 15, 2026 at 8:00 AM");
    expect(html).toContain(
      "It did not go out: its channel was disconnected from the workspace before it went out."
    );
    expect(html).not.toContain("the platform refused its text");
    expect(html).toContain(
      "Peal cannot tell whether it went out: the platform did not answer. Check Mastodon before you post it again, then say what you found."
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
      "Attempt 1, Jun 15, 2026 at 8:00 AM: the platform asked Peal to wait"
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
      "Tentative 1, le 15 juin 2026 à 08:00 : la plateforme a demandé à Peal d’attendre"
    );
    expect(html).toContain(">Republier<");
  });
});
