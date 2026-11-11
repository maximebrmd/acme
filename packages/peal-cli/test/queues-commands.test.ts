import { assert, describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Ref, Schema } from "effect";

import { reshuffleLines } from "#commands/queues.ts";

import { filesLayer, signedIn } from "./signed-in.ts";
import { evergreenQueueId, weekdaysQueueId } from "./studio-queues.ts";
import { draftId, launchSetId, mastodonId, tiktokId } from "./studio.ts";
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
        `Queue ${evergreenQueueId} of Studio is now Evergreen (UTC, 1 slot, 0 channels). Posts it placed keep their times: peal queues reshuffle moves them onto its slots.`
      );

      yield* session.printed([
        "queues",
        "update",
        "Weekdays",
        "--name",
        "Mornings",
        ...inStudio,
      ]);

      // A queue's channels and slots can be emptied too.
      yield* session.printed([
        "queues",
        "update",
        "Mornings",
        "--clear-channels",
        "--clear-slots",
        ...inStudio,
      ]);

      assert.deepStrictEqual(yield* changes(session.studio), [
        `queue:update:${evergreenQueueId}:Evergreen:UTC:tuesday@12:00::plain`,
        `queue:update:${weekdaysQueueId}:Mornings:UTC:monday@09:00,wednesday@09:00:${mastodonId}:default`,
        `queue:update:${weekdaysQueueId}:Mornings:UTC:::default`,
      ]);

      for (const [given, refusal] of [
        [
          ["--clear-channels", "--channel", mastodonId],
          "Give --channel or --clear-channels, not both.",
        ],
        [
          ["--clear-slots", "--slot", "mon@09:00"],
          "Give --slot or --clear-slots, not both.",
        ],
      ] as const) {
        assert.include(
          yield* session.refused([
            "queues",
            "update",
            "Mornings",
            ...given,
            ...inStudio,
          ]),
          refusal
        );
      }

      assert.include(
        yield* session.refused(["queues", "update", "Mornings", ...inStudio]),
        "Give --name, --zone, --slot, --clear-slots, --channel, --clear-channels, --set, --no-set, --default or several"
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

describe("peal post --queue and peal posts queue", () => {
  it.effect("sends a post onto the default queue's next free slot", () =>
    Effect.gen(function* sends() {
      const session = yield* signedIn();

      const sent = yield* session.printed([
        "post",
        "An evergreen post.",
        "--default-queue",
        ...inStudio,
      ]);

      assert.match(
        sent,
        /^Added to queue Weekdays, on its slot at 2026-11-11T09:00:00Z \(UTC\), on .+: post \S+\./u
      );

      const { posts } = yield* Ref.get(session.studio.state);

      const made = posts.find(
        ({ content }) => content.text === "An evergreen post."
      );

      assert.strictEqual(made?.queueId, weekdaysQueueId);
      assert.deepStrictEqual(
        made?.targets.map(({ channelId }) => channelId),
        [mastodonId]
      );

      // The next takes the slot after.
      assert.include(
        yield* session.printed([
          "post",
          "Another evergreen post.",
          "--queue=weekdays",
          "--channel",
          tiktokId,
          ...inStudio,
        ]),
        "on its slot at 2026-11-16T09:00:00Z (UTC)"
      );

      // Listed by the queue that placed them.
      const listed = yield* session.printed([
        "posts",
        "list",
        "--queue",
        "Weekdays",
        "--json",
        ...inStudio,
      ]);

      assert.include(listed, weekdaysQueueId);

      // The name follows the flag as any flag's value does.
      assert.include(
        yield* session.refused([
          "post",
          "Nowhere to go.",
          "--queue",
          "Evergreen",
          "--channel",
          mastodonId,
          ...inStudio,
        ]),
        "The queue has no slot: add some with peal queues update --slot"
      );

      for (const timings of [
        ["--default-queue", "--now"],
        ["--queue", "Weekdays", "--default-queue"],
      ]) {
        assert.include(
          yield* session.refused([
            "post",
            "Twice told.",
            ...timings,
            ...inStudio,
          ]),
          "Give one of --at, --now, --queue and --default-queue."
        );
      }

      // A queue's name is never taken for the post's text.
      yield* session.refused(["post", "--queue", "Evergreen", ...inStudio]);
      assert.isUndefined(
        (yield* Ref.get(session.studio.state)).posts.find(
          ({ content }) => content.text === "Evergreen"
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("checks a post at the slot it would take, making nothing", () =>
    Effect.gen(function* checks() {
      const session = yield* signedIn();

      const checked = yield* session.printed([
        "post",
        "An evergreen post.",
        "--default-queue",
        "--dry-run",
        ...inStudio,
      ]);

      assert.include(checked, "Checked, and made nothing");
      assert.include(
        checked,
        "Added now, it would take the queue's slot at 2026-11-11T09:00:00Z."
      );
      assert.notInclude((yield* changes(session.studio)).join("\n"), "send:");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("puts a draft on a queue's next free slot", () =>
    Effect.gen(function* queues() {
      const session = yield* signedIn();

      const placed = yield* session.printed([
        "posts",
        "queue",
        draftId,
        ...inStudio,
      ]);

      assert.match(
        placed,
        new RegExp(
          `^Put post ${draftId} on queue Weekdays, on its slot at 2026-11-11T09:00:00Z \\(UTC\\)`,
          "u"
        )
      );

      const { posts } = yield* Ref.get(session.studio.state);

      assert.strictEqual(
        posts.find(({ id }) => id === draftId)?.status,
        "scheduled"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "moves a queue's waiting posts onto its slots as they now are",
    () =>
      Effect.gen(function* reshuffles() {
        const session = yield* signedIn();

        // Wednesday 11 and Monday 16 November, at 09:00.
        for (const text of [
          "The first queued post.",
          "The second queued post.",
        ]) {
          yield* session.printed([
            "post",
            text,
            "--queue",
            "Weekdays",
            "--channel",
            mastodonId,
            ...inStudio,
          ]);
        }

        // Wednesdays only, from now on.
        yield* session.printed([
          "queues",
          "update",
          "Weekdays",
          "--slot",
          "wed@09:00",
          ...inStudio,
        ]);

        assert.strictEqual(
          yield* session.printed([
            "queues",
            "reshuffle",
            "weekdays",
            ...inStudio,
          ]),
          "Moved 1 post of Weekdays onto its slots; 1 already on theirs or not yours to move."
        );
        assert.include(
          yield* changes(session.studio),
          `queue:reshuffle:${weekdaysQueueId}:1`
        );

        const second = (yield* Ref.get(session.studio.state)).posts.find(
          ({ content }) => content.text === "The second queued post."
        );

        assert.strictEqual(
          second?.schedule === null || second === undefined
            ? undefined
            : DateTime.formatIso(second.schedule.at),
          "2026-11-18T09:00:00.000Z"
        );

        assert.deepStrictEqual(
          parsed(
            yield* session.printed([
              "queues",
              "reshuffle",
              "Weekdays",
              "--json",
              ...inStudio,
            ])
          ),
          { moved: 0, remaining: 0, stoppedBy: null, unchanged: 2 }
        );

        assert.include(
          yield* session.refused([
            "queues",
            "reshuffle",
            "Evergreen",
            ...inStudio,
          ]),
          "The queue has no slot"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it("says why a reshuffle stopped, and how many posts it left", () => {
    const queue = {
      channelIds: [],
      channelSetId: null,
      createdAt: DateTime.makeUnsafe("2026-10-07T09:00:00Z"),
      id: weekdaysQueueId,
      isDefault: true,
      name: "Weekdays",
      slots: [],
      timeZone: "UTC",
      unavailableChannelIds: [],
    };

    expect(
      reshuffleLines(queue, {
        moved: 12,
        remaining: 3,
        stoppedBy: "planLimit",
        unchanged: 1,
      })
    ).toStrictEqual([
      "Moved 12 posts of Weekdays onto its slots; 1 already on theirs or not yours to move.",
      "Stopped at a month the plan has no room in: 3 posts not moved. peal billing shows the plan.",
    ]);
    expect(
      reshuffleLines(queue, {
        moved: 0,
        remaining: 1,
        stoppedBy: "changed",
        unchanged: 0,
      })[1]
    ).toBe(
      "Stopped as the queue was saved meanwhile: 1 post not moved. Run it again."
    );
  });
});
