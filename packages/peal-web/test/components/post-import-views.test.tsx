import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import {
  DuplicatePost,
  PlanLimitReached,
  PostContentInvalid,
  UnknownChannels,
} from "peal-contract";
import type { SocialChannel, ImportRowResult, Post } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ImportChannelsView,
  ImportFileField,
  ImportHelpView,
  ImportStateView,
} from "#components/posts/post-import-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import type { ImportState } from "#posts/import-state.ts";

const message = "A synthetic refusal from the server";

const channel: SocialChannel = {
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

const post = (id: string): Post => ({
  authorId: null,
  content: { media: [], overrides: [], text: "Launch day" },
  createdVia: null,
  id,
  occurrence: null,
  outcome: null,
  queueId: null,
  recyclingId: null,
  schedule: null,
  scheduledBy: null,
  scheduledVia: null,
  shortenLinks: false,
  status: "scheduled",
  tagIds: [],
  targets: [],
});

const refusedRow: ImportRowResult = {
  _tag: "refused",
  refusal: new UnknownChannels({ channelIds: ["c9"], message }),
  row: 2,
};

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

const ignore = () => {
  // A view under test is never clicked.
};

const view = (state: ImportState, links = new Map<string, ReactNode>()) => (
  <ImportStateView
    channels={[channel]}
    postLinks={links}
    state={state}
    onChooseAgain={ignore}
    onConfirm={ignore}
    onRetry={ignore}
  />
);

describe(ImportFileField, () => {
  it("takes a CSV file, labelled", async () => {
    const html = await render(
      "en",
      <ImportFileField disabled={false} fileName={null} onChoose={ignore} />
    );

    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".csv,text/csv"');
    expect(html).toContain("CSV file");
  });

  it("names the file chosen, in French", async () => {
    const html = await render(
      "fr",
      <ImportFileField disabled fileName="posts.csv" onChoose={ignore} />
    );

    expect(html).toContain("Choisi : posts.csv");
  });
});

describe(ImportStateView, () => {
  it("shows nothing before a file is chosen", async () => {
    await expect(render("en", view({ _tag: "idle" }))).resolves.toBe("");
  });

  it.each([
    ["en", "The file is longer than one import takes, 1,000,000 characters"],
    ["fr", "Le fichier est plus long que ce qu’un import accepte"],
  ] as const)(
    "refuses a file too long before sending it, in %s",
    async (locale, text) => {
      await expect(
        render(locale, view({ _tag: "fileRefused", reason: "tooLong" }))
      ).resolves.toContain(text);
    }
  );

  it("says the file is being checked", async () => {
    await expect(
      render("en", view({ _tag: "checking", csv: "text" }))
    ).resolves.toContain("Checking the file…");
  });

  it.each([
    ["en", "names a column Peal does not know: title."],
    ["fr", "nomme une colonne que Peal ne connaît pas : title."],
  ] as const)(
    "names the column the server cannot read, in %s",
    async (locale, text) => {
      await expect(
        render(
          locale,
          view({
            _tag: "unreadable",
            column: "title",
            problem: "unknownColumn",
          })
        )
      ).resolves.toContain(text);
    }
  );

  it("offers Import once every row is valid", async () => {
    const html = await render(
      "en",
      view({
        _tag: "checked",
        csv: "text",
        key: "key-1",
        rows: [
          { _tag: "valid", row: 1 },
          { _tag: "valid", row: 2 },
        ],
      })
    );

    expect(html).toContain("All 2 rows are valid.");
    expect(html).toContain("Import 2 posts");
    expect(html).toContain("Row 2");
  });

  it("does not offer Import while a row is refused, and says why in words", async () => {
    const html = await render(
      "en",
      view({
        _tag: "checked",
        csv: "text",
        key: null,
        rows: [{ _tag: "valid", row: 1 }, refusedRow],
      })
    );

    expect(html).not.toContain("Import ");
    expect(html).toContain("1 row cannot be made, so nothing will be made.");
    expect(html).toContain("These channels are not the workspace’s: c9.");
    expect(html).not.toContain(message);
  });

  it.each([
    ["en", "Refused", "These channels are not the workspace’s: c9."],
    [
      "fr",
      "Refusée",
      "Ces canaux ne sont pas ceux de l’espace de travail : c9.",
    ],
  ] as const)(
    "names a refused row's state in %s",
    async (locale, state, reason) => {
      const html = await render(
        locale,
        view({ _tag: "checked", csv: "text", key: null, rows: [refusedRow] })
      );

      expect(html).toContain(state);
      expect(html).toContain(reason);
    }
  );

  it("lists the content's violations under its row", async () => {
    const html = await render(
      "en",
      view({
        _tag: "checked",
        csv: "text",
        key: null,
        rows: [
          {
            _tag: "refused",
            refusal: new PostContentInvalid({
              message,
              violations: [{ _tag: "noChannels" }],
            }),
            row: 1,
          },
        ],
      })
    );

    expect(html).toContain("Fix these before scheduling:");
    expect(html).toContain("<li>");
  });

  it("says a row repeats another of the file without the server's words", async () => {
    const html = await render(
      "fr",
      view({
        _tag: "checked",
        csv: "text",
        key: null,
        rows: [
          {
            _tag: "refused",
            refusal: new DuplicatePost({ duplicates: [], message }),
            row: 3,
          },
        ],
      })
    );

    expect(html).toContain("Une ligne plus haut dans le fichier");
    expect(html).not.toContain(message);
  });

  it("explains the plan's limit on a row", async () => {
    const html = await render(
      "en",
      view({
        _tag: "checked",
        csv: "text",
        key: null,
        rows: [
          {
            _tag: "refused",
            refusal: new PlanLimitReached({
              allowed: 30,
              billingUrl: "https://peal.example/app/w/billing",
              limit: "scheduledPosts",
              message,
              plan: "free",
              planWithRoom: "starter",
              used: 30,
            }),
            row: 1,
          },
        ],
      })
    );

    expect(html).toContain("allows no more posts going out that month");
  });

  it.each([
    ["en", "It has 4 cells where the first line names 3"],
    ["fr", "Elle a 4 cellules là où la première ligne en nomme 3"],
  ] as const)(
    "says a row has the wrong number of cells, in %s",
    async (locale, text) => {
      const html = await render(
        locale,
        view({
          _tag: "checked",
          csv: "text",
          key: null,
          rows: [
            {
              _tag: "unreadable",
              cells: { expected: 3, found: 4 },
              problems: [],
              row: 1,
            },
          ],
        })
      );

      expect(html).toContain(text);
    }
  );

  it("names the cells that cannot be read", async () => {
    const html = await render(
      "en",
      view({
        _tag: "checked",
        csv: "text",
        key: null,
        rows: [
          {
            _tag: "unreadable",
            problems: [
              { column: "at", problem: "invalid" },
              { column: "text", problem: "missing" },
            ],
            row: 1,
          },
        ],
      })
    );

    expect(html).toContain("at cannot be read");
    expect(html).toContain("text is missing");
  });

  it("says a file without rows has nothing to import", async () => {
    await expect(
      render("en", view({ _tag: "checked", csv: "x", key: null, rows: [] }))
    ).resolves.toContain("The file lists no post under its first line");
  });

  it("keeps the rows and says it imports while it does", async () => {
    const html = await render(
      "en",
      view({
        _tag: "importing",
        csv: "text",
        key: "key-1",
        retried: false,
        rows: [{ _tag: "valid", row: 1 }],
      })
    );

    expect(html).toContain("Importing…");
    expect(html).toContain("disabled");
  });

  it.each([
    ["en", "1 post was made.", "Made"],
    ["fr", "1 publication a été créée.", "Créée"],
  ] as const)("links each post made, in %s", async (locale, summary, state) => {
    const id = "00000000-0000-7000-8000-000000000001";

    const html = await render(
      locale,
      view(
        {
          _tag: "imported",
          created: 1,
          retried: false,
          rows: [{ _tag: "created", post: post(id), replayed: false, row: 1 }],
        },
        new Map([
          [
            id,
            <a key={id} href={`/posts/${id}`}>
              open
            </a>,
          ],
        ])
      )
    );

    expect(html).toContain(summary);
    expect(html).toContain(state);
    expect(html).toContain(`<a href="/posts/${id}">open</a>`);
  });

  it("says which rows were made before, under the same key", async () => {
    const html = await render(
      "en",
      view({
        _tag: "imported",
        created: 2,
        retried: false,
        rows: [
          {
            _tag: "created",
            post: post("00000000-0000-7000-8000-000000000001"),
            replayed: true,
            row: 1,
          },
          {
            _tag: "created",
            post: post("00000000-0000-7000-8000-000000000002"),
            replayed: false,
            row: 2,
          },
        ],
      })
    );

    expect(html).toContain(
      "1 post was made. 1 other was made before, under this import’s key, and not twice."
    );
    expect(html).toContain("Made before");
  });

  it.each([
    ["en", "importing this file again would make the others twice"],
    ["fr", "importer ce fichier à nouveau créerait les autres deux fois"],
  ] as const)(
    "says what to do when rows were refused meanwhile, in %s",
    async (locale, text) => {
      const html = await render(
        locale,
        view({
          _tag: "imported",
          created: 1,
          retried: false,
          rows: [
            {
              _tag: "created",
              post: post("00000000-0000-7000-8000-000000000001"),
              replayed: false,
              row: 1,
            },
            refusedRow,
          ],
        })
      );

      expect(html).toContain(text);
      expect(html).toContain(
        locale === "en"
          ? "Choose the corrected file"
          : "Choisir le fichier corrigé"
      );
    }
  );

  it("says nothing was made when the import's own check refused a row", async () => {
    await expect(
      render(
        "en",
        view({
          _tag: "imported",
          created: 0,
          retried: false,
          rows: [{ _tag: "valid", row: 1 }, refusedRow],
        })
      )
    ).resolves.toContain(
      "Nothing was made: 1 row was refused since the check."
    );
  });

  it.each([
    ["en", "forbidden", "Your role no longer allows importing posts"],
    ["fr", "unknown", "La demande n’a pas abouti."],
  ] as const)(
    "offers a retry of the same step, in %s",
    async (locale, reason, text) => {
      const html = await render(
        locale,
        view({ _tag: "failed", reason, step: { _tag: "checking", csv: "x" } })
      );

      expect(html).toContain(text);
      expect(html).toContain(locale === "en" ? "Try again" : "Réessayer");
    }
  );
});

describe("a retried import the server then refused", () => {
  it.each([
    ["en", "The first try’s answer was lost, and it may have made posts"],
    ["fr", "La réponse du premier essai a été perdue"],
  ] as const)("never says nothing was made, in %s", async (locale, text) => {
    const html = await render(
      locale,
      view({
        _tag: "imported",
        created: 0,
        retried: true,
        rows: [{ _tag: "valid", row: 1 }, refusedRow],
      })
    );

    expect(html).toContain(text);
    expect(html).not.toContain(
      locale === "en" ? "Nothing was made" : "Rien n’a été créé"
    );
  });
});

describe(ImportHelpView, () => {
  it.each([
    ["en", "Download a sample", "Channel ids, or a channel set’s name"],
    ["fr", "Télécharger un exemple", "Des identifiants de canaux"],
  ] as const)(
    "lists every column and offers a sample, in %s",
    async (locale, sample, channels) => {
      const html = await render(
        locale,
        <ImportHelpView onDownloadSample={ignore} />
      );

      for (const column of [
        "text",
        "channels",
        "at",
        "time_zone",
        "media",
        "allow_duplicate",
        "idempotency_key",
      ]) {
        expect(html).toContain(`<code class="text-xs">${column}</code>`);
      }

      expect(html).toContain(sample);
      expect(html).toContain(channels);
      expect(html).toContain("100");
    }
  );
});

describe(ImportChannelsView, () => {
  it("lists each channel with its id to copy, and the sets", async () => {
    const html = await render(
      "en",
      <ImportChannelsView
        channels={[channel]}
        sets={["Launch"]}
        onCopy={ignore}
      />
    );

    expect(html).toContain("Field Notes (@notes@social.example)");
    expect(html).toContain(channel.id);
    expect(html).toContain(
      "Copy the id of Field Notes (@notes@social.example)"
    );
    expect(html).toContain(
      "Channel sets, which a row may name instead: Launch."
    );
  });

  it("says when no channel is connected, in French", async () => {
    await expect(
      render(
        "fr",
        <ImportChannelsView channels={[]} sets={[]} onCopy={ignore} />
      )
    ).resolves.toContain("Aucun canal n’est encore connecté");
  });
});
