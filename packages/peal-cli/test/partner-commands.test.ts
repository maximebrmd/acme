import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { newLinkId, newLinkUrl, usedLinkId } from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal links and peal partner, against the in-memory studio: what each
// subcommand asks the server, what it prints, and how it explains a
// refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

describe("peal links", () => {
  it.effect("creates a link, and shows its address once", () =>
    Effect.gen(function* creates() {
      const session = yield* signedIn();

      const created = yield* session.printed([
        "links",
        "create",
        "--platform",
        "mastodon",
        "--return-url",
        "https://app.example.test/social",
        "--hours",
        "24",
        "--locale",
        "fr",
        ...inStudio,
      ]);

      assert.include(
        created,
        `Created the connect link ${newLinkId} for Studio.`
      );
      assert.match(created, /Status\s+waiting/u);
      assert.match(created, /Expires\s+2026-11-10T12:00:00Z/u);
      assert.match(
        created,
        /Returns to\s+https:\/\/app\.example\.test\/social/u
      );
      assert.include(created, "shown this once");
      assert.include(created, newLinkUrl);

      // Afterwards, the link is read without its address.
      const shown = yield* session.printed([
        "links",
        "show",
        newLinkId,
        ...inStudio,
      ]);

      assert.match(shown, /Platform\s+mastodon/u);
      assert.notInclude(shown, "synthetic-token");
      assert.notInclude(
        yield* session.printed(["links", "list", ...inStudio]),
        "synthetic-token"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "link:create:mastodon",
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the links, and says what a used one connected", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["links", "list", ...inStudio]);

      assert.include(listed, "Connect links of Studio:");
      assert.match(
        listed,
        new RegExp(
          `${usedLinkId}\\s+mastodon\\s+used\\s+expires 2026-11-15T09:00:00Z`,
          "u"
        )
      );

      const shown = yield* session.printed([
        "links",
        "show",
        usedLinkId,
        ...inStudio,
      ]);

      assert.match(shown, /Connected\s+0190f3a0-0000-7000-8000-00000000d001/u);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("revokes a link once, and leaves one that is over as it is", () =>
    Effect.gen(function* revokes() {
      const session = yield* signedIn();

      yield* session.printed([
        "links",
        "create",
        "--platform",
        "bluesky",
        ...inStudio,
      ]);

      assert.include(
        yield* session.printed(["links", "revoke", newLinkId, ...inStudio]),
        `Revoked the connect link ${newLinkId}: it opens nothing more.`
      );
      assert.include(
        yield* session.printed(["links", "revoke", usedLinkId, ...inStudio]),
        `The connect link ${usedLinkId} was used already: nothing changed.`
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "link:create:bluesky",
        `link:revoke:${newLinkId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains what the server, or the command itself, refuses", () =>
    Effect.gen(function* refuses() {
      const session = yield* signedIn();

      const link = (...flags: readonly string[]) =>
        session.refused(["links", "create", ...flags, ...inStudio]);

      assert.include(
        yield* link(
          "--platform",
          "mastodon",
          "--return-url",
          "https://evil.example.test/social"
        ),
        "The return address was refused"
      );
      assert.include(
        yield* link("--platform", "pinterest"),
        "This server cannot connect accounts of this platform."
      );
      assert.include(
        yield* link("--platform", "carrier-pigeon"),
        "--platform takes one of these:"
      );
      assert.include(
        yield* link("--platform", "mastodon", "--locale", "de"),
        "--locale takes en or fr."
      );
      assert.include(
        yield* session.refused(["links", "show", "not-a-link", ...inStudio]),
        "The workspace has no connect link with that id"
      );
      // A viewer of Shop connects nothing there.
      assert.include(
        yield* session.refused([
          "links",
          "create",
          "--platform",
          "mastodon",
          "--workspace",
          "shop",
        ]),
        "Peal refused: your role in this workspace does not allow it"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal partner", () => {
  it.effect("shows the account, its keys and the workspaces it owns", () =>
    Effect.gen(function* shows() {
      const session = yield* signedIn();

      const shown = yield* session.printed(["partner", "show", ...inStudio]);

      assert.include(shown, "Partner account of Studio:");
      assert.match(shown, /Name\s+Studio Suite/u);
      assert.match(shown, /Return origins\s+https:\/\/app\.example\.test/u);
      assert.match(shown, /Workspaces\s+2/u);
      assert.match(shown, /Channels\s+5/u);

      const keys = yield* session.printed(["partner", "keys", ...inStudio]);

      assert.match(
        keys,
        /backend\s+peal_partner_synt…\s+until revoked\s+workspaces:read workspaces:write/u
      );

      const owned = yield* session.printed([
        "partner",
        "workspaces",
        ...inStudio,
      ]);

      assert.include(owned, "(2 of 2, newest first)");
      assert.match(owned, /Garage Dupont\s+cus_002\s+2 channels/u);
      assert.match(owned, /Boulangerie Martin\s+cus_001\s+1 channel\s/u);

      const found = yield* session.printed([
        "partner",
        "workspaces",
        "--external-id",
        "cus_001",
        ...inStudio,
      ]);

      assert.include(found, "Boulangerie Martin");
      assert.notInclude(found, "Garage Dupont");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "shows what the partner account used per customer, page by page",
    () =>
      Effect.gen(function* usage() {
        const session = yield* signedIn();

        const shown = yield* session.printed([
          "partner",
          "usage",
          "--from",
          "2026-11-01",
          "--to",
          "2026-11-03",
          "--limit",
          "2",
          ...inStudio,
        ]);

        assert.include(
          shown,
          "Usage of the partner account of Studio from 2026-11-01 to 2026-11-03, by UTC day:"
        );
        assert.match(shown, /Workspaces\s+2/u);
        assert.match(shown, /Channels\s+5/u);
        assert.match(shown, /Posts published\s+7: bluesky 3, x 4/u);
        assert.match(shown, /Channel-days\s+14, over 2 days counted/u);
        assert.match(
          shown,
          /External id\s+Name\s+Channels\s+Channel-days\s+Posts published/u
        );
        assert.match(shown, /–\s+Studio \(home\)\s+2\s+4\s+1/u);
        assert.match(shown, /cus_002\s+Garage Dupont\s+2\s+4\s+4/u);
        // The next page keeps the period and the page's size.
        assert.include(
          shown,
          "More: peal partner usage --from 2026-11-01 --to 2026-11-03 --limit 2 --before studio-next-page"
        );
        assert.include(shown, "Customers deleted since are not listed.");

        const rest = yield* session.printed([
          "partner",
          "usage",
          "--before",
          "studio-next-page",
          ...inStudio,
        ]);

        assert.match(rest, /cus_001\s+Boulangerie Martin\s+1\s+2\s+2/u);
        assert.notInclude(rest, "Studio (home)");
        assert.notInclude(rest, "More:");
        // The account as a whole comes with the first page only.
        assert.notInclude(rest, "Posts published  ");
        assert.notMatch(rest, /Channel-days\s+\d+, over/u);

        const json = parsed(
          yield* session.printed(["partner", "usage", "--json", ...inStudio])
        );

        assert.deepInclude(json, {
          current: { channels: 5, workspaces: 2 },
        });
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says so when a workspace has none, or may not read it", () =>
    Effect.gen(function* none() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused(["partner", "show", "--workspace", "shop"]),
        "Peal refused: your role in this workspace does not allow it"
      );
      assert.include(
        yield* session.refused(["partner", "usage", "--workspace", "shop"]),
        "Peal refused: your role in this workspace does not allow it"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("--json on links and the partner account", () => {
  it.effect("prints the API's answers, a new link's address included", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const created = parsed(
        yield* session.printed([
          "links",
          "create",
          "--platform",
          "mastodon",
          "--json",
          ...inStudio,
        ])
      );

      assert.deepInclude(created, { url: newLinkUrl });

      assert.deepInclude(
        parsed(
          yield* session.printed([
            "links",
            "show",
            usedLinkId,
            "--json",
            ...inStudio,
          ])
        ),
        { id: usedLinkId, status: "completed" }
      );
      assert.isArray(
        parsed(yield* session.printed(["links", "list", "--json", ...inStudio]))
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "links",
            "revoke",
            newLinkId,
            "--json",
            ...inStudio,
          ])
        ),
        { id: newLinkId, status: "revoked" }
      );

      assert.deepInclude(
        parsed(
          yield* session.printed(["partner", "show", "--json", ...inStudio])
        ),
        { canOpen: false }
      );
      assert.isArray(
        parsed(
          yield* session.printed(["partner", "keys", "--json", ...inStudio])
        )
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "partner",
            "workspaces",
            "--json",
            ...inStudio,
          ])
        ),
        { total: 2 }
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
