import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { evergreenQueueId, weekdaysQueueId } from "./studio-queues.ts";
import { launchSetId, mastodonId, tiktokId } from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal queues against the in-memory studio: what each command asks the
// server, what it prints, and how it explains a refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

const inShop = ["--workspace", "shop"];

const newQueueId = "0190f3a0-0000-7000-8000-00000000a303";

const mastodon = `${mastodonId} (mastodon @studio@social.example.test)`;

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

describe("peal queues", () => {
  it.effect("lists the workspace's queues, the default first", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed(["queues", "list", ...inStudio]),
        [
          "Queues of Studio:",
          `  ${weekdaysQueueId}  Weekdays  default, UTC, 2 slots, 1 channel`,
          "      mon@09:00 wed@09:00",
          `      ${mastodon}`,
          `  ${evergreenQueueId}  Evergreen  UTC, 0 slots, 0 channels`,
          "      no slot",
        ].join("\n")
      );

      const [first] = Schema.decodeUnknownSync(
        Schema.Array(Schema.Struct({ id: Schema.String }))
      )(
        parsed(
          yield* session.printed(["queues", "list", "--json", ...inStudio])
        )
      );

      assert.strictEqual(first?.id, weekdaysQueueId);
      assert.strictEqual(
        yield* session.printed(["queues", "list", ...inShop]),
        "Shop has no queue: peal queues create makes one."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows a queue and previews its coming slots", () =>
    Effect.gen(function* shows() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "queues",
        "show",
        "weekdays",
        ...inStudio,
      ]);

      assert.include(
        shown,
        `Weekdays (${weekdaysQueueId}): default, UTC, 2 slots, 1 channel.`
      );
      assert.include(shown, "  Slots: mon@09:00 wed@09:00");
      assert.include(shown, "Next free slot: 2026-11-11T09:00:00Z.");

      assert.strictEqual(
        yield* session.printed([
          "queues",
          "preview",
          "Weekdays",
          "--count",
          "3",
          ...inStudio,
        ]),
        [
          "Coming slots of Weekdays, in UTC's week:",
          "  2026-11-11T09:00:00Z  free",
          "  2026-11-16T09:00:00Z  free",
          "  2026-11-18T09:00:00Z  free",
          "Next free slot: 2026-11-11T09:00:00Z.",
        ].join("\n")
      );

      assert.include(
        yield* session.printed(["queues", "preview", "Evergreen", ...inStudio]),
        "No free slot: the queue has no slot. Add some with peal queues update --slot."
      );

      assert.include(
        yield* session.refused(["queues", "show", "Nowhere", ...inStudio]),
        "The workspace has no queue Nowhere, by id or by name: peal queues list shows them."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("creates a queue from slots, a zone, channels and a set", () =>
    Effect.gen(function* creates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "queues",
          "create",
          " Launch week ",
          "--slot",
          "Mon@08:30",
          "--slot",
          "friday@17:00",
          "--slot",
          "mon@08:30",
          "--zone",
          "Europe/Paris",
          "--channel",
          tiktokId,
          "--set",
          "launch",
          "--default",
          ...inStudio,
        ]),
        `Created queue Launch week in Studio (default, Europe/Paris, 2 slots, 1 channel): ${newQueueId}.`
      );

      const { queues } = yield* Ref.get(session.studio.state);

      assert.deepStrictEqual(
        queues.map(({ isDefault, name }) => [name, isDefault]),
        [
          ["Weekdays", false],
          ["Evergreen", false],
          ["Launch week", true],
        ]
      );
      assert.strictEqual(queues[2]?.channelSetId, launchSetId);

      assert.include(
        yield* session.refused([
          "queues",
          "create",
          "Broken",
          "--slot",
          "someday@25:00",
          ...inStudio,
        ]),
        "--slot takes a day and a time of day on a 24-hour clock, such as mon@09:00 or friday@17:30: not someday@25:00."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("updates what its flags name and keeps the rest", () =>
    Effect.gen(function* updates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "queues",
          "update",
          "Evergreen",
          "--slot",
          "tue@12:00",
          ...inStudio,
        ]),
        `Queue ${evergreenQueueId} of Studio is now Evergreen (UTC, 1 slot, 0 channels). Posts it placed keep their times.`
      );

      yield* session.printed([
        "queues",
        "update",
        "Weekdays",
        "--name",
        "Mornings",
        ...inStudio,
      ]);

      assert.deepStrictEqual(yield* changes(session.studio), [
        `queue:update:${evergreenQueueId}:Evergreen:UTC:tuesday@12:00::plain`,
        `queue:update:${weekdaysQueueId}:Mornings:UTC:monday@09:00,wednesday@09:00:${mastodonId}:default`,
      ]);

      assert.include(
        yield* session.refused(["queues", "update", "Mornings", ...inStudio]),
        "Give --name, --zone, --slot, --channel, --set, --no-set, --default or several"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes a queue, whose posts stay scheduled", () =>
    Effect.gen(function* deletes() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed(["queues", "delete", "Evergreen", ...inStudio]),
        "Deleted queue Evergreen of Studio: the posts it placed stay scheduled at their times."
      );
      assert.strictEqual(
        yield* session.printed([
          "queues",
          "delete",
          "Weekdays",
          "--json",
          ...inStudio,
        ]),
        "null"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `queue:delete:${evergreenQueueId}`,
        `queue:delete:${weekdaysQueueId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
