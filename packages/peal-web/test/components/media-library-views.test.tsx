import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Media } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SearchStatus } from "#components/media/library-status.tsx";
import { LibraryToolbarView } from "#components/media/library-toolbar.tsx";
import {
  MediaPreviewBody,
  MediaPreviewDialog,
  useMediaName,
} from "#components/media/media-preview.tsx";
import { loadMessages } from "#i18n/messages.ts";
import type { LibrarySearch } from "#media/library-search.ts";

const created = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const photo: Media = {
  aiGenerated: false,
  altText: "A synthetic harbour at dawn",
  byteSize: 200_000,
  codec: null,
  contentType: "image/png",
  createdAt: created,
  dimensions: { height: 800, width: 1200 },
  durationMs: null,
  fileName: "Harbour.png",
  id: "00000000-0000-7000-8000-00000000a001",
  kind: "image",
  pageCount: null,
  status: { _tag: "ready" },
  updatedAt: created,
  url: "https://store.example.test/read/a001",
};

const render = async (locale: "en" | "fr", node: ReactNode) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {node}
    </NextIntlClientProvider>
  );
};

const Name = ({ media }: { readonly media: Media }) => {
  const nameOf = useMediaName();

  return <span>{nameOf(media)}</span>;
};

const ignore = (_search: LibrarySearch) => {
  // The view only says what was chosen.
};

describe(LibraryToolbarView, () => {
  it("shows the search as typed and the kind chosen", async () => {
    const search = { kind: "video", text: "launch" } as const;

    const english = await render(
      "en",
      <LibraryToolbarView search={search} onSearch={ignore} />
    );

    expect(english).toMatch(/<search[^>]*>.*type="search"/u);
    expect(english).toContain('value="launch"');
    expect(english).toContain('maxLength="100"');
    expect(english).toContain("Search by file name or description");
    expect(english).toContain("Videos");
  });

  it("speaks French", async () => {
    const french = await render(
      "fr",
      <LibraryToolbarView search={{ kind: null, text: "" }} onSearch={ignore} />
    );

    expect(french).toContain("Rechercher par nom de fichier ou description");
    expect(french).toContain("Tous les types");
  });
});

describe(MediaPreviewBody, () => {
  it("shows an image whole, with its facts and its description", async () => {
    const html = await render("en", <MediaPreviewBody media={photo} />);

    expect(html).toContain('src="https://store.example.test/read/a001"');
    expect(html).toContain('alt="A synthetic harbour at dawn"');
    expect(html).toContain('width="1200"');
    expect(html).toContain("1200 × 800");
    expect(html).toContain("A synthetic harbour at dawn");
  });

  it("plays a video", async () => {
    const video = await render(
      "en",
      <MediaPreviewBody
        media={{
          ...photo,
          contentType: "video/mp4",
          durationMs: 12_300,
          kind: "video",
        }}
      />
    );

    expect(video).toContain("<video");
    expect(video).toContain("controls");
    expect(video).toContain("12.3 s");
  });

  it("hands a document to a tab of its own, never showing it", async () => {
    const pdf = await render(
      "fr",
      <MediaPreviewBody
        media={{
          ...photo,
          contentType: "application/pdf",
          dimensions: null,
          kind: "document",
          pageCount: 12,
        }}
      />
    );

    expect(pdf).not.toMatch(/<img|<iframe|<embed|<object/u);
    expect(pdf).toContain('target="_blank"');
    expect(pdf).toContain('rel="noopener noreferrer"');
    expect(pdf).toContain("Ouvrir le document dans un nouvel onglet");
    expect(pdf).toContain("12 pages");
  });

  it("says there is nothing to show while the file is not stored", async () => {
    const html = await render(
      "en",
      <MediaPreviewBody
        media={{
          ...photo,
          altText: null,
          status: { _tag: "pending" },
          url: null,
        }}
      />
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("The file is not stored");
    expect(html).toContain("No description");
  });
});

describe(useMediaName, () => {
  it("shows a file's name as text, whatever it holds", async () => {
    const html = await render(
      "en",
      <Name
        media={{ ...photo, fileName: '<img src=x onerror="alert(1)">.png' }}
      />
    );

    expect(html).not.toContain("<img");
    expect(html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;.png"
    );
  });

  it("names a file without a name by its kind", async () => {
    await expect(
      render("en", <Name media={{ ...photo, fileName: null }} />)
    ).resolves.toBe("<span>Image</span>");
    await expect(
      render(
        "fr",
        <Name
          media={{
            ...photo,
            contentType: "application/pdf",
            fileName: null,
            kind: "document",
          }}
        />
      )
    ).resolves.toBe("<span>Document PDF</span>");
  });
});

describe(MediaPreviewDialog, () => {
  it("fits the window: the title and the close button stay, the file and its text scroll", async () => {
    const html = await render(
      "en",
      <MediaPreviewDialog
        media={{ ...photo, altText: "A long description. ".repeat(100) }}
        open
        returnFocusTo={() => null}
        onOpenChange={() => {
          // Shown open.
        }}
      />
    );

    const [header = "", body = ""] = html.split('data-preview-body=""');

    // The box is no taller than the window, and does not scroll itself.
    expect(html).toMatch(/max-h-\[90dvh\]/u);
    // The name comes before the region that scrolls, never in it.
    expect(header).toContain("Harbour.png");
    expect(body).toMatch(/^ class="[^"]*overflow-y-auto/u);
    // The close button is pinned to the box's top, out of the scrolling
    // region: a row of its own that sticks.
    expect(body).toMatch(
      /<\/div><\/div><div class="sticky top-2[^"]*"><button[^>]*>.*Close/u
    );
  });
});

describe(SearchStatus, () => {
  it("says what a search found, for those who do not see the list change", async () => {
    await expect(
      render("en", <SearchStatus count={3} more narrowed />)
    ).resolves.toContain("<output");
    await expect(
      render("en", <SearchStatus count={3} more narrowed />)
    ).resolves.toContain("3 files shown, and more");
    await expect(
      render("fr", <SearchStatus count={0} more={false} narrowed />)
    ).resolves.toContain("Aucun média ne correspond");
    await expect(
      render("en", <SearchStatus count={3} more={false} narrowed={false} />)
    ).resolves.not.toContain("files shown");
  });
});
