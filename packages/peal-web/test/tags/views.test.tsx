import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { maxTagsPerPost } from "peal-contract";
import type { Tag } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CalendarFilters } from "#components/posts/calendar-filters.tsx";
import { ChipTags } from "#components/posts/chip-tags.tsx";
import {
  PostTagsView,
  TagChoicesView,
} from "#components/posts/post-tags-field.tsx";
import {
  TagFieldsView,
  TagItemView,
  TagList,
} from "#components/tags/tag-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

// The texts among `expected` that the markup lacks.
const missingFrom = (html: string, expected: readonly string[]) =>
  expected.filter((text) => !html.includes(text));

const noop = () => {
  // Nothing changes while rendering to markup.
};

const tag = (id: string, name: string, colour: Tag["colour"]): Tag => ({
  colour,
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id,
  name,
});

const launch = tag("t1", "Launch week", "teal");
const news = tag("t2", "Newsletter", "pink");

describe(TagItemView, () => {
  it("shows a tag with its colour, named for those who cannot see it", async () => {
    const html = await render(
      "en",
      <ul>
        <TagItemView
          tag={launch}
          nameId="tag-name"
          actions={<button type="button">Edit</button>}
        />
      </ul>
    );

    expect(
      missingFrom(html, [
        "Launch week",
        "bg-tag-teal",
        "Teal",
        'id="tag-name"',
        "<button",
      ])
    ).toStrictEqual([]);
  });

  it("shows no actions to a member who may not change tags", async () => {
    const html = await render(
      "fr",
      <ul>
        <TagItemView tag={news} />
      </ul>
    );

    expect(html).toContain("Rose");
    expect(html).not.toContain("<button");
  });
});

describe(TagFieldsView, () => {
  it("offers every colour of the palette as a radio button with its name", async () => {
    const html = await render(
      "en",
      <TagFieldsView
        draft={{ colour: "amber", name: "Launch" }}
        error={null}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(html.match(/type="radio"/gu)).toHaveLength(9);

    expect(
      missingFrom(html, [
        "Grey",
        "Red",
        "Orange",
        "Amber",
        "Green",
        "Teal",
        "Blue",
        "Purple",
        "Pink",
        'value="Launch"',
        'for="new-tag-colour-amber"',
      ])
    ).toStrictEqual([]);

    expect(html).toMatch(/id="new-tag-colour-amber"[^>]*checked=""/u);
  });

  it("explains a name already taken, and a workspace that is full", async () => {
    const taken = await render(
      "fr",
      <TagFieldsView
        draft={{ colour: "gray", name: "Lancement" }}
        error={{ key: "nameTaken" }}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(taken).toContain(
      "L’espace de travail a déjà une étiquette de ce nom."
    );

    const full = await render(
      "en",
      <TagFieldsView
        draft={{ colour: "gray", name: "Launch" }}
        error={{ allowed: 100, key: "tooMany" }}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(full).toContain("The workspace keeps 100 tags, the most it may.");
  });
});

describe(TagList, () => {
  it("lists tags under a name, and shows nothing for none", async () => {
    const html = await render(
      "en",
      <TagList label="Tags" tags={[launch, news]} />
    );

    expect(
      missingFrom(html, [
        'aria-label="Tags"',
        "Launch week",
        "Newsletter",
        "bg-tag-pink",
      ])
    ).toStrictEqual([]);

    await expect(
      render("en", <TagList label="Tags" tags={[]} />)
    ).resolves.toBe("");
  });
});

describe(PostTagsView, () => {
  it("shows a post's tags and what changes them", async () => {
    const html = await render(
      "en",
      <PostTagsView
        tags={[launch]}
        editor={<button type="button">Choose tags</button>}
      />
    );

    expect(
      missingFrom(html, ["Tags</h2>", "Launch week", "Choose tags"])
    ).toStrictEqual([]);
  });

  it("says a post has no tag", async () => {
    await expect(render("fr", <PostTagsView tags={[]} />)).resolves.toContain(
      "Aucune étiquette."
    );
  });
});

describe(TagChoicesView, () => {
  it("ticks the post's tags among the workspace's", async () => {
    const html = await render(
      "en",
      <TagChoicesView
        disabled={false}
        idPrefix="post"
        tagIds={["t2"]}
        tags={[launch, news]}
        onToggle={noop}
      />
    );

    expect(html).toMatch(/<input[^>]*id="post-tag-t2"[^>]*checked=""/u);
    expect(html).not.toMatch(/<input[^>]*id="post-tag-t1"[^>]*checked=""/u);
    expect(html).not.toContain("tags at most");
  });

  it("takes no other tag on a post that is full, and says why", async () => {
    const many = Array.from({ length: maxTagsPerPost + 1 }, (_, index) =>
      tag(`t${index}`, `Tag ${index}`, "blue")
    );

    const html = await render(
      "en",
      <TagChoicesView
        disabled={false}
        idPrefix="post"
        tagIds={many.slice(0, maxTagsPerPost).map(({ id }) => id)}
        tags={many}
        onToggle={noop}
      />
    );

    expect(html).toContain("A post has 10 tags at most.");
    expect(html).toMatch(
      new RegExp(`<input disabled=""[^>]*id="post-tag-t${maxTagsPerPost}"`, "u")
    );
    expect(html).not.toMatch(/<input disabled=""[^>]*id="post-tag-t0"/u);
  });
});

describe(ChipTags, () => {
  it("shows the colour of three tags at most, then how many more", async () => {
    const tags = [
      launch,
      news,
      tag("t3", "Product", "red"),
      tag("t4", "Hiring", "green"),
      tag("t5", "Events", "blue"),
    ];

    const html = await render(
      "en",
      <ChipTags tags={tags} title="Tags: Launch week and four more." />
    );

    expect(html.match(/data-slot="tag-dot"/gu)).toHaveLength(3);

    expect(
      missingFrom(html, [
        "bg-tag-teal",
        "bg-tag-pink",
        "bg-tag-red",
        "+2",
        'title="Tags: Launch week and four more."',
      ])
    ).toStrictEqual([]);

    expect(html).not.toContain("bg-tag-green");
  });

  it("shows nothing for a post without tags", async () => {
    await expect(
      render("en", <ChipTags tags={[]} title="No tag." />)
    ).resolves.toBe("");
  });
});

describe(CalendarFilters, () => {
  const channel = {
    avatarUrl: null,
    connection: null,
    displayName: null,
    handle: "@peal@mastodon.example",
    id: "c1",
    label: null,
    platform: "mastodon",
    status: { _tag: "active" },
    tokenExpiresAt: null,
  } as const;

  it("offers the tags and the channels, and says nothing while nothing is chosen", async () => {
    const html = await render(
      "en",
      <CalendarFilters
        channels={[channel]}
        filter={{ channelIds: [], tagIds: [] }}
        hidden={0}
        tags={[launch]}
        onChange={noop}
      />
    );

    expect(missingFrom(html, [">Tags<", ">Channels<"])).toStrictEqual([]);
    expect(html).not.toContain("Clear filters");
    expect(html).not.toContain("hidden by filters");
  });

  it("says how many posts the choice hides, with a way to clear it", async () => {
    const html = await render(
      "en",
      <CalendarFilters
        channels={[channel]}
        filter={{ channelIds: ["c1"], tagIds: ["t1", "t2"] }}
        hidden={3}
        tags={[launch, news]}
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "Tags (2)",
        "Channels (1)",
        "Clear filters",
        "3 posts hidden by filters",
        "<output",
      ])
    ).toStrictEqual([]);
  });

  it("says so in French, and leaves out a kind with nothing to choose", async () => {
    const html = await render(
      "fr",
      <CalendarFilters
        channels={[]}
        filter={{ channelIds: [], tagIds: ["t1"] }}
        hidden={1}
        tags={[launch]}
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "Étiquettes (1)",
        "Effacer les filtres",
        "1 publication masquée par les filtres",
      ])
    ).toStrictEqual([]);

    expect(html).not.toContain("Canaux");
  });
});
