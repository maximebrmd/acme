import { describe, expect, it } from "@effect/vitest";
import { Cause, DateTime, Exit, Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import {
  FeedAddressRefused,
  FeedReadsLimited,
  FeedTemplateInvalid,
} from "peal-contract";
import type { Feed } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import {
  FeedFieldsView,
  FeedItemsView,
  FeedItemView,
  FeedPreviewView,
} from "#components/feeds/feed-views.tsx";
import { feedErrorOf } from "#feeds/feed-error.ts";
import { loadMessages } from "#i18n/messages.ts";

// Feeds in the web app: how a feed, its items and a preview read, in both
// languages, and how a refusal is explained.

const at = (iso: string) => DateTime.makeUnsafe(iso);

const feed: Feed = {
  attachPicture: false,
  channelIds: [],
  channelSetId: null,
  createdAt: at("2026-06-15T07:00:00Z"),
  failingSince: at("2026-06-16T07:00:00Z"),
  id: "0190f3a0-0000-7000-8000-0000000fe001",
  lastCheckedAt: at("2026-06-16T07:00:00Z"),
  lastFailure: "serverError",
  mode: "queue",
  nextCheckAt: at("2026-06-16T08:04:00Z"),
  queueId: null,
  since: at("2026-06-15T07:00:00Z"),
  startedBy: null,
  startedVia: { id: null, name: null, via: "web" },
  status: "active",
  statusAt: null,
  stopReason: null,
  template: "{title}\n\n{link}",
  title: "A synthetic blog",
  updatedAt: at("2026-06-16T07:00:00Z"),
  url: "https://blog.example/feed.xml",
};

const render = async (locale: "en" | "fr", node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {node}
    </NextIntlClientProvider>
  );

describe("a feed", () => {
  it("says where it is and why its reads fail, in both languages", async () => {
    const english = await render(
      "en",
      <FeedItemView feed={feed} actions={null} items={null} />
    );

    const french = await render(
      "fr",
      <FeedItemView
        feed={{ ...feed, status: "stopped", stopReason: "gone" }}
        actions={null}
        items={null}
      />
    );

    expect(english).toContain("A synthetic blog");
    expect(english).toContain("Posts on a queue");
    expect(english).toContain("The last read failed: its site failed.");
    expect(french).toContain("Arrêté : son site indique qu’il n’existe plus.");
  });

  it("lists what became of its items, never what they said", async () => {
    const english = await render(
      "en",
      <FeedItemsView
        items={[
          {
            itemAt: null,
            outcome: "heldBack",
            postId: "0190f3a0-0000-7000-8000-00000000f001",
            reason: "duplicate",
            seenAt: at("2026-06-16T07:00:00Z"),
          },
        ]}
      />
    );

    expect(english).toContain(
      "a draft was made instead, as the same post already goes out"
    );
  });

  it("previews each item as its post would say it", async () => {
    const english = await render(
      "en",
      <FeedPreviewView
        preview={{
          items: [
            {
              link: "https://blog.example/a",
              picture: null,
              publishedAt: null,
              summary: null,
              text: "New: A",
              title: "A",
            },
            {
              link: null,
              picture: null,
              publishedAt: null,
              summary: null,
              text: null,
              title: null,
            },
          ],
          title: "A synthetic blog",
        }}
      />
    );

    expect(english).toContain("New: A");
    expect(english).toContain("The template writes nothing from this item.");
  });

  it("names the placeholders its template takes, and warns about a queue", async () => {
    const fields = (
      <FeedFieldsView
        channels={[]}
        disabled={false}
        draft={{
          channelIds: [],
          mode: "draft",
          queueId: "",
          template: "{title}",
          url: "",
        }}
        mayQueue={false}
        queues={[]}
        onChange={() => {
          // Nothing changes while rendering to markup.
        }}
      />
    );

    await expect(render("en", fields)).resolves.toContain(
      "{title}, {link} and {summary} are replaced"
    );
    await expect(render("fr", fields)).resolves.toContain(
      "{title}, {link} et {summary} sont remplacés"
    );
    await expect(render("en", fields)).resolves.toContain(
      "Putting posts on a queue takes a role that schedules posts."
    );
  });
});

const refusal = (error: { readonly _tag: string }) =>
  feedErrorOf(Exit.failCause(Cause.fail(error)));

describe("a refused feed", () => {
  it("is explained from the API's error", () => {
    expect(
      refusal(new FeedAddressRefused({ reason: "notPublic" }))
    ).toStrictEqual(Option.some({ key: "address", reason: "notPublic" }));
    expect(
      refusal(
        new FeedTemplateInvalid({
          placeholder: "author",
          reason: "unknownPlaceholder",
        })
      )
    ).toStrictEqual(
      Option.some({
        key: "template",
        placeholder: "author",
        reason: "unknownPlaceholder",
      })
    );
    expect(
      refusal(new FeedReadsLimited({ retryAfterSeconds: 90 }))
    ).toStrictEqual(Option.some({ key: "readsLimited", minutes: 2 }));
  });
});
