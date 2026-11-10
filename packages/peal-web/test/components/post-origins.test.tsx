import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PostOrigins } from "#components/posts/post-origins.tsx";
import { loadMessages } from "#i18n/messages.ts";

type Origins = ComponentProps<typeof PostOrigins>["post"];

const unknown: Origins = {
  authorId: null,
  createdVia: null,
  scheduledBy: null,
  scheduledVia: null,
};

const web = { id: null, name: null, via: "web" } as const;

const render = async (
  locale: "en" | "fr",
  post: Partial<Origins>,
  viewerId: string | null = null
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      <PostOrigins post={{ ...unknown, ...post }} viewerId={viewerId} />
    </NextIntlClientProvider>
  );

describe(PostOrigins, () => {
  it("shows nothing for a post from before origins were kept", async () => {
    await expect(render("en", {})).resolves.toBe("");
  });

  it("tells a post made and scheduled in the web app", async () => {
    const html = await render("en", {
      authorId: "member-1",
      createdVia: web,
      scheduledBy: "member-2",
      scheduledVia: web,
    });

    expect(html).toContain("<p>Created in the web app</p>");
    expect(html).toContain("<p>Scheduled in the web app</p>");
  });

  it("names the reader when they are the member behind it", async () => {
    const html = await render(
      "en",
      {
        authorId: "member-1",
        createdVia: web,
        scheduledBy: "member-2",
        scheduledVia: web,
      },
      "member-1"
    );

    expect(html).toContain("<p>Created in the web app by you</p>");
    expect(html).toContain("<p>Scheduled in the web app</p>");
  });

  it("names the API key, and never shows its id", async () => {
    const named = await render("en", {
      createdVia: { id: "key-0001", name: "Newsletter script", via: "apiKey" },
      scheduledVia: { id: "key-0001", name: null, via: "apiKey" },
    });

    expect(named).toContain(
      "<p>Created with the API key “Newsletter script”</p>"
    );
    expect(named).toContain("<p>Scheduled with an API key</p>");
    expect(named).not.toContain("key-0001");
  });

  it("names the application, and whom it acted for", async () => {
    const html = await render(
      "en",
      {
        authorId: "member-1",
        createdVia: {
          id: "client-0001",
          name: "Example Assistant",
          via: "application",
        },
        scheduledBy: "member-1",
        scheduledVia: { id: "client-0002", name: null, via: "application" },
      },
      "member-1"
    );

    expect(html).toContain(
      "<p>Created by the application “Example Assistant”, acting as you</p>"
    );
    expect(html).toContain("<p>Scheduled by an application, acting as you</p>");
    expect(html).not.toContain("client-000");
  });

  it("shows a draft's creation alone", async () => {
    const html = await render("en", {
      createdVia: { id: "client-0001", name: "  ", via: "application" },
    });

    expect(html).toContain("<p>Created by an application</p>");
    expect(html).not.toContain("Scheduled");
  });

  it("writes it in French", async () => {
    const html = await render(
      "fr",
      {
        authorId: "member-1",
        createdVia: {
          id: "client-0001",
          name: "Example Assistant",
          via: "application",
        },
        scheduledBy: "member-1",
        scheduledVia: web,
      },
      "member-1"
    );

    expect(html).toContain(
      "<p>Création par l’application « Example Assistant », en votre nom</p>"
    );
    expect(html).toContain(
      "<p>Programmation dans l’application web, par vous</p>"
    );
  });
});
