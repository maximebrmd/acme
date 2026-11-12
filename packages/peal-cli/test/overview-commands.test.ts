import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { AgendaPageSchema, OverviewSchema } from "peal-contract";

import { draftingKey, filesLayer, signedIn } from "./signed-in.ts";
import { awaitingId, scheduledId, studioMe } from "./studio.ts";

// peal overview and peal agenda, against the in-memory studio: what they
// print across the person's workspaces, and that a key is refused before
// anything is asked.

const decodeOverview = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(OverviewSchema))
);

const decodeAgenda = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(AgendaPageSchema))
);

describe("peal overview", () => {
  it.effect(
    "says what needs attention in each workspace, and once when nothing does",
    () =>
      Effect.gen(function* attention() {
        const session = yield* signedIn();
        const printed = yield* session.printed(["overview"]);

        assert.include(printed, "Studio (studio, owner)");
        assert.include(
          printed,
          "1 post failed on a channel in the last 7 days."
        );
        assert.include(
          printed,
          "1 post waits for an approval, which you may give."
        );
        assert.include(printed, "Shop (shop, viewer)");
        assert.include(printed, "  Nothing needs attention.");
        assert.notInclude(printed, " 0 ");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("names a workspace that refuses the person, with no figure", () =>
    Effect.gen(function* refused() {
      const [studio, shop] = studioMe.workspaces;

      assert.isDefined(studio);
      assert.isDefined(shop);

      const session = yield* signedIn({
        me: {
          ...studioMe,
          workspaces: [studio, { ...shop, twoStepRequired: true }],
        },
      });

      const printed = yield* session.printed(["overview"]);

      assert.include(
        printed,
        "Shop (shop, viewer): it requires two-step verification, which your account does not have on."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the API's answer with --json", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const page = decodeOverview(
        yield* session.printed(["overview", "--json"])
      );

      assert.deepStrictEqual(
        page.workspaces.map(({ slug }) => slug),
        ["studio", "shop"]
      );
      assert.isNull(page.nextCursor);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("is refused to an API key before any request", () =>
    Effect.gen(function* key() {
      const session = yield* signedIn({ keys: [draftingKey], signIn: false });

      const refusal = yield* session
        .withEnv({ PEAL_API_KEY: draftingKey.key })
        .refused(["overview"]);

      assert.include(refusal, "An API key cannot read across workspaces");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal agenda", () => {
  it.effect(
    "lists what goes out in the next 14 days, with the workspace's name",
    () =>
      Effect.gen(function* lists() {
        const session = yield* signedIn();
        const printed = yield* session.printed(["agenda"]);
        const lines = printed.trimEnd().split("\n");

        assert.match(
          lines[0] ?? "",
          /^What goes out from 2026-11-09T12:00:\d{2}Z to 2026-11-23T12:00:\d{2}Z, in UTC:$/u
        );
        assert.match(
          lines[1] ?? "",
          /^ {2}2026-11-20T09:00:00Z\s+Studio\s+mastodon\s+scheduled\s+A synthetic post that goes out next week\.$/u
        );
        assert.match(lines[2] ?? "", /awaitingApproval/u);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("narrows to the workspaces named, by slug", () =>
    Effect.gen(function* narrowed() {
      const session = yield* signedIn();

      const page = decodeAgenda(
        yield* session.printed(["agenda", "--workspace", "shop", "--json"])
      );

      assert.deepStrictEqual(page.items, []);

      const studio = decodeAgenda(
        yield* session.printed([
          "agenda",
          "--workspace",
          "studio",
          "--workspace",
          "shop",
          "--json",
        ])
      );

      assert.deepStrictEqual(
        studio.items.map(({ postId }) => postId),
        [scheduledId, awaitingId]
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a workspace the person does not belong to", () =>
    Effect.gen(function* unknown() {
      const session = yield* signedIn();

      const refusal = yield* session.refused([
        "agenda",
        "--workspace",
        "elsewhere",
      ]);

      assert.include(refusal, "You belong to no workspace elsewhere.");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a range past 31 days, as the server does", () =>
    Effect.gen(function* tooLong() {
      const session = yield* signedIn();

      const refusal = yield* session.refused([
        "agenda",
        "--from",
        "2026-11-01T00:00:00Z",
        "--to",
        "2026-12-15T00:00:00Z",
      ]);

      assert.include(
        refusal,
        "The agenda lists 31 days at most: give a --to closer to --from."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
